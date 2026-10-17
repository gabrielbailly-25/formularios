'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { GleraForm, uid } from '../../../lib/types';
import { getForm, saveResponse, getSavedChild, saveChild } from '../../../lib/store';
import { GLERA_LOGO } from '../../../lib/logo';

export default function PublicForm() {
  const params = useParams();
  const id = String(params?.id || '');
  const [form, setForm] = useState<GleraForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [childName, setChildName] = useState('');
  const [childSurname, setChildSurname] = useState('');
  const [attends, setAttends] = useState<'si' | 'no' | ''>('');
  const [observation, setObservation] = useState('');
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const f = await getForm(id);
      if (!f) setNotFound(true);
      else setForm(f);
      const saved = getSavedChild();
      setChildName(saved.name);
      setChildSurname(saved.surname);
      setLoading(false);
    })();
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form) return;
    if (!childName.trim()) { setError('Escribe el nombre de tu hijo.'); return; }
    if (!childSurname.trim()) { setError('Escribe los apellidos de tu hijo.'); return; }
    if (!attends) { setError('Elige si se apunta o no.'); return; }
    for (const q of form.questions) {
      if (q.required) {
        const v = answers[q.id];
        if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) {
          setError(`Responde a: ${q.label}`);
          return;
        }
      }
    }
    setSending(true);
    try {
      await saveResponse({
        id: uid(),
        formId: form.id,
        childName: childName.trim(),
        childSurname: childSurname.trim(),
        attends: attends as 'si' | 'no',
        observation: observation.trim(),
        answers,
        createdAt: Date.now(),
      });
      // Guarda el nombre para futuros formularios en este móvil
      saveChild(childName, childSurname);
      setSent(true);
    } catch (err) {
      console.error(err);
      setError('No se pudo enviar. Comprueba tu conexión e inténtalo de nuevo.');
    } finally {
      setSending(false);
    }
  }

  if (loading) return <main style={{ maxWidth: 620, margin: '40px auto', padding: 20, textAlign: 'center' }}>Cargando formulario…</main>;
  if (notFound || !form) return (
    <main style={{ maxWidth: 620, margin: '40px auto', padding: 20, textAlign: 'center' }}>
      <div className="card" style={{ padding: 32 }}>
        <div style={{ fontSize: 40 }}>😕</div>
        <h1>Formulario no encontrado</h1>
        <p style={{ color: '#64748b' }}>Puede que el enlace no sea correcto o que el formulario haya sido borrado.</p>
      </div>
    </main>
  );

  if (sent) {
    return (
      <main style={{ maxWidth: 620, margin: '40px auto', padding: 20 }}>
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 52 }}>✅</div>
          <h1 style={{ margin: '10px 0 6px' }}>¡Gracias, {childName}!</h1>
          <p style={{ color: '#64748b' }}>{attends === 'si' ? 'Queda apuntado al plan. ¡Nos vemos allí! 🎉' : 'Queda anotado que no se apunta a este plan.'}</p>
          <p style={{ fontSize: 14, color: '#94a3b8' }}>Tu nombre queda guardado en este móvil para que no tengas que escribirlo en los próximos formularios.</p>
          <button className="btn btn-ghost" onClick={() => { setSent(false); setObservation(''); setAnswers({}); setAttends(''); }}>Rellenar otra respuesta</button>
        </div>
      </main>
    );
  }

  if (form.status === 'closed') {
    return (
      <main style={{ maxWidth: 620, margin: '40px auto', padding: 20 }}>
        {form.headerImage && <img src={form.headerImage} alt="" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 16 }} />}
        <div className="card" style={{ padding: 28, textAlign: 'center', marginTop: 14 }}>
          <h1>{form.title}</h1>
          <p style={{ color: '#64748b' }}>Este formulario ya está cerrado y no admite más respuestas.</p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 620, margin: '0 auto', padding: 16, paddingBottom: 40 }}>
      {form.headerImage && <img src={form.headerImage} alt="" style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 16 }} />}
      <div className="card" style={{ padding: 22, marginTop: 14, textAlign: 'center' }}>
        <img src={GLERA_LOGO} alt="Asociación Juvenil Glera" style={{ height: 56, width: 'auto', marginBottom: 4 }} />
        <h1 style={{ margin: '6px 0 4px', fontSize: 26, lineHeight: 1.2 }}>{form.title}</h1>
        {(form.planDate || form.planPlace) && <p style={{ color: '#64748b', margin: '0 0 12px' }}>{form.planDate}{form.planDate && form.planPlace ? ' · ' : ''}{form.planPlace}</p>}
        {form.descriptionHtml && <div dangerouslySetInnerHTML={{ __html: form.descriptionHtml }} style={{ fontSize: 16, lineHeight: 1.6 }} />}
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ padding: 22, marginTop: 14, display: 'grid', gap: 16 }}>
        <div>
          <label className="label">Nombre del hijo *</label>
          <input className="field" value={childName} onChange={e => setChildName(e.target.value)} placeholder="Ej. Luis" autoComplete="given-name" />
        </div>
        <div>
          <label className="label">Apellidos del hijo *</label>
          <input className="field" value={childSurname} onChange={e => setChildSurname(e.target.value)} placeholder="Ej. García Pérez" autoComplete="family-name" />
          {(childName || childSurname) && <p style={{ fontSize: 13, color: '#64748b', margin: '6px 0 0' }}>Se recordará en este móvil para próximos formularios. Puedes cambiarlo si lo necesitas.</p>}
        </div>

        <div>
          <label className="label">¿Se apunta al plan? *</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button type="button" onClick={() => setAttends('si')} style={{ border: attends === 'si' ? '2px solid #0d9488' : '1px solid #d1d5db', background: attends === 'si' ? '#ccfbf1' : '#fff', borderRadius: 12, padding: 14, fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>✅ Sí, se apunta</button>
            <button type="button" onClick={() => setAttends('no')} style={{ border: attends === 'no' ? '2px solid #b91c1c' : '1px solid #d1d5db', background: attends === 'no' ? '#fee2e2' : '#fff', borderRadius: 12, padding: 14, fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>❌ No se apunta</button>
          </div>
        </div>

        {form.questions.map(q => (
          <div key={q.id}>
            <label className="label">{q.label}{q.required ? ' *' : ''}</label>
            {q.type === 'text' && <input className="field" value={answers[q.id] || ''} onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })} placeholder={q.placeholder || ''} />}
            {q.type === 'textarea' && <textarea className="field" rows={3} value={answers[q.id] || ''} onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })} />}
            {q.type === 'number' && <input className="field" type="number" value={answers[q.id] ?? ''} onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })} />}
            {q.type === 'yesno' && (
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setAnswers({ ...answers, [q.id]: 'Sí' })} style={{ border: answers[q.id] === 'Sí' ? '2px solid #0d9488' : '1px solid #d1d5db', background: answers[q.id] === 'Sí' ? '#ccfbf1' : '#fff', borderRadius: 12, padding: '10px 18px', fontWeight: 700, cursor: 'pointer' }}>Sí</button>
                <button type="button" onClick={() => setAnswers({ ...answers, [q.id]: 'No' })} style={{ border: answers[q.id] === 'No' ? '2px solid #b91c1c' : '1px solid #d1d5db', background: answers[q.id] === 'No' ? '#fee2e2' : '#fff', borderRadius: 12, padding: '10px 18px', fontWeight: 700, cursor: 'pointer' }}>No</button>
              </div>
            )}
            {q.type === 'radio' && (
              <div style={{ display: 'grid', gap: 8 }}>
                {q.options.map(opt => (
                  <label key={opt} style={{ display: 'flex', gap: 10, alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: 12, padding: '11px 12px', cursor: 'pointer', background: answers[q.id] === opt ? '#f0fdfa' : '#fff' }}>
                    <input type="radio" name={q.id} checked={answers[q.id] === opt} onChange={() => setAnswers({ ...answers, [q.id]: opt })} /> {opt}
                  </label>
                ))}
              </div>
            )}
            {q.type === 'checkbox' && (
              <div style={{ display: 'grid', gap: 8 }}>
                {q.options.map(opt => {
                  const arr: string[] = Array.isArray(answers[q.id]) ? answers[q.id] : [];
                  return (
                    <label key={opt} style={{ display: 'flex', gap: 10, alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: 12, padding: '11px 12px', cursor: 'pointer', background: arr.includes(opt) ? '#f0fdfa' : '#fff' }}>
                      <input type="checkbox" checked={arr.includes(opt)} onChange={() => {
                        const next = arr.includes(opt) ? arr.filter(x => x !== opt) : [...arr, opt];
                        setAnswers({ ...answers, [q.id]: next });
                      }} /> {opt}
                    </label>
                  );
                })}
              </div>
            )}
            {q.type === 'select' && (
              <select className="field" value={answers[q.id] || ''} onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}>
                <option value="" disabled>Elige una opción…</option>
                {q.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            )}
          </div>
        ))}

        <div>
          <label className="label">Observaciones</label>
          <textarea className="field" rows={3} value={observation} onChange={e => setObservation(e.target.value)} placeholder="Alergias, algo que debamos saber, hora de recogida…" />
        </div>

        {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 12, fontSize: 14 }}>{error}</div>}
        <button className="btn btn-primary" type="submit" disabled={sending} style={{ fontSize: 17, padding: '14px 18px' }}>{sending ? 'Enviando…' : 'Enviar respuesta'}</button>
        <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', margin: 0 }}>Solo se guarda nombre, apellidos, si se apunta, observaciones y tus respuestas. Glera.</p>
      </form>
    </main>
  );
}
