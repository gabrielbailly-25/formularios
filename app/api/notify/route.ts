import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';

function getAdmin(): typeof admin {
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT || '';
    if (!raw) throw new Error('Falta FIREBASE_SERVICE_ACCOUNT en las variables de entorno.');
    const sa = JSON.parse(raw);
    admin.initializeApp({
      credential: admin.credential.cert(sa),
      projectId: sa.project_id,
    });
  }
  return admin;
}

/**
 * POST /api/notify
 * Body: { formId, formTitle, childName, childSurname, attends }
 * Envía un push a todos los tokens del admin con el título del plan y el
 * nombre del hijo, y pone la insignia con el total de respuestas.
 */
export async function POST(req: NextRequest) {
  try {
    const { formId, formTitle, childName, childSurname, familyName, attends } = await req.json();
    const who = (familyName || '').trim() || `${childName || ''} ${childSurname || ''}`.trim();
    if (!formId || !who) {
      return NextResponse.json({ ok: false, error: 'Faltan datos' }, { status: 400 });
    }
    const a = getAdmin();
    const db = a.firestore();

    const tokensSnap = await db.collection('glera_admin_tokens').get();
    const tokens = tokensSnap.docs.map((d) => d.id);
    if (!tokens.length) {
      return NextResponse.json({ ok: true, sent: 0, note: 'Sin dispositivos suscritos' });
    }

    // Insignia = total de respuestas recibidas
    let badge = '';
    try {
      const countSnap = await db.collection('glera_responses').count().get();
      badge = String(countSnap.data().count || 0);
    } catch {}

    const attendsTxt = attends === 'si' ? ' · Se apunta ✅' : attends === 'no' ? ' · No se apunta' : '';
    const title = `📋 ${formTitle || 'Nuevo formulario'}`;
    const body = `${who} ha rellenado el formulario${attendsTxt}`;

    const message: admin.messaging.MulticastMessage = {
      tokens,
      data: {
        title,
        body,
        badge,
        url: `/admin/${formId}`,
      },
      android: { priority: 'high' },
    };

    const res = await a.messaging().sendEachForMulticast(message);

    // Limpia tokens que ya no valen
    const dead: string[] = [];
    res.responses.forEach((r, i) => {
      if (!r.success) {
        const code = (r.error as any)?.code || '';
        if (code.includes('registration-token-not-registered') || code.includes('invalid-argument')) {
          dead.push(tokens[i]);
        }
      }
    });
    for (const t of dead) {
      try { await db.collection('glera_admin_tokens').doc(t).delete(); } catch {}
    }

    return NextResponse.json({ ok: true, sent: res.successCount, failed: res.failureCount });
  } catch (e: any) {
    console.error('notify error', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Error' }, { status: 500 });
  }
}
