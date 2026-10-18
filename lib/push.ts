// Utilidades de notificaciones push para el admin.
// El admin acepta las notificaciones una vez; su token FCM se guarda en
// Firestore (colección glera_admin_tokens) y el servidor le envía un push
// cada vez que una familia rellena un formulario.

import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { getDb } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

function ensureApp() {
  if (!getApps().length) {
    initializeApp({
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    });
  }
}

function getMessagingInstance(): Messaging | null {
  try {
    ensureApp();
    return getMessaging();
  } catch {
    return null;
  }
}

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    Boolean(process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY)
  );
}

export function pushPermission(): NotificationPermission | 'unsupported' {
  if (!pushSupported()) return 'unsupported';
  return Notification.permission;
}

/** Pide permiso, registra el service worker, obtiene el token FCM y lo guarda. */
export async function enableAdminPush(): Promise<string> {
  if (!pushSupported()) throw new Error('Este navegador no admite notificaciones push.');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Permiso de notificaciones denegado.');
  const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  const messaging = getMessagingInstance();
  if (!messaging) throw new Error('No se pudo iniciar Firebase Messaging.');
  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: reg,
  });
  if (!token) throw new Error('No se obtuvo el token de notificaciones.');
  const db = getDb();
  if (!db) throw new Error('Firebase no está configurado.');
  await setDoc(doc(db, 'glera_admin_tokens', token), {
    createdAt: Date.now(),
    ua: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : '',
  });
  return token;
}

/** Escucha mensajes con la página abierta: insignia + aviso nativo. */
export function listenForegroundPush(onNotify: (title: string, body: string) => void): () => void {
  const messaging = getMessagingInstance();
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    const data = (payload as any).data || {};
    const title = data.title || 'Glera · Formularios';
    const body = data.body || '';
    try {
      const n = parseInt(data.badge || '0', 10);
      if (!isNaN(n) && n > 0 && 'setAppBadge' in navigator) {
        (navigator as any).setAppBadge(n).catch(() => {});
      }
    } catch {}
    try {
      if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/icon-192.png' });
      }
    } catch {}
    onNotify(title, body);
  });
}

/** Limpia la insignia del icono (al entrar el admin a revisar). */
export function clearAppBadge() {
  try {
    if ('clearAppBadge' in navigator) {
      (navigator as any).clearAppBadge().catch(() => {});
    }
  } catch {}
}
