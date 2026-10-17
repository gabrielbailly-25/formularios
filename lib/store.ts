import { collection, doc, getDocs, setDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { getDb, isFirebaseConfigured } from './firebase';
import { GleraForm, GleraResponse } from './types';

// Almacenamiento: Firestore si hay config, si no localStorage (modo demo local).
// Así la app funciona sin configurar nada y, al añadir las variables en Vercel, pasa a guardado compartido.

const LS_FORMS = 'glera_forms_v1';
const LS_RESP = 'glera_responses_v1';

function readLS<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}
function writeLS<T>(key: string, items: T[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(items));
}

export async function listForms(): Promise<GleraForm[]> {
  const db = getDb();
  if (db && isFirebaseConfigured()) {
    try {
      const snap = await getDocs(query(collection(db, 'glera_forms'), orderBy('createdAt', 'desc')));
      return snap.docs.map(d => d.data() as GleraForm);
    } catch (e) {
      console.warn('Firestore listForms falló, uso local', e);
    }
  }
  return readLS<GleraForm>(LS_FORMS).sort((a, b) => b.createdAt - a.createdAt);
}

export async function getForm(id: string): Promise<GleraForm | null> {
  const all = await listForms();
  return all.find(f => f.id === id) || null;
}

export async function saveForm(form: GleraForm): Promise<void> {
  const db = getDb();
  if (db && isFirebaseConfigured()) {
    try {
      await setDoc(doc(db, 'glera_forms', form.id), form);
      return;
    } catch (e) {
      console.warn('Firestore saveForm falló, uso local', e);
    }
  }
  const all = readLS<GleraForm>(LS_FORMS);
  const idx = all.findIndex(f => f.id === form.id);
  if (idx >= 0) all[idx] = form; else all.unshift(form);
  writeLS(LS_FORMS, all);
}

export async function deleteForm(id: string): Promise<void> {
  const db = getDb();
  if (db && isFirebaseConfigured()) {
    try {
      await deleteDoc(doc(db, 'glera_forms', id));
      // borra también respuestas
      const res = await listResponses(id);
      for (const r of res) {
        try { await deleteDoc(doc(db, 'glera_responses', r.id)); } catch {}
      }
      return;
    } catch (e) {
      console.warn('Firestore deleteForm falló', e);
    }
  }
  writeLS(LS_FORMS, readLS<GleraForm>(LS_FORMS).filter(f => f.id !== id));
  writeLS(LS_RESP, readLS<GleraResponse>(LS_RESP).filter(r => r.formId !== id));
}

export async function listResponses(formId: string): Promise<GleraResponse[]> {
  const db = getDb();
  if (db && isFirebaseConfigured()) {
    try {
      const snap = await getDocs(query(collection(db, 'glera_responses'), where('formId', '==', formId), orderBy('createdAt', 'desc')));
      return snap.docs.map(d => d.data() as GleraResponse);
    } catch (e) {
      console.warn('Firestore listResponses falló, uso local', e);
    }
  }
  return readLS<GleraResponse>(LS_RESP).filter(r => r.formId === formId).sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveResponse(resp: GleraResponse): Promise<void> {
  const db = getDb();
  if (db && isFirebaseConfigured()) {
    try {
      await setDoc(doc(db, 'glera_responses', resp.id), resp);
      return;
    } catch (e) {
      console.warn('Firestore saveResponse falló, uso local', e);
    }
  }
  const all = readLS<GleraResponse>(LS_RESP);
  all.unshift(resp);
  writeLS(LS_RESP, all);
}

export async function deleteResponse(id: string): Promise<void> {
  const db = getDb();
  if (db && isFirebaseConfigured()) {
    try { await deleteDoc(doc(db, 'glera_responses', id)); return; } catch {}
  }
  writeLS(LS_RESP, readLS<GleraResponse>(LS_RESP).filter(r => r.id !== id));
}

// Memoria del nombre del hijo en el móvil de la familia
const LS_CHILD = 'glera_hijo_v1';
export function getSavedChild(): { name: string; surname: string } {
  if (typeof window === 'undefined') return { name: '', surname: '' };
  try {
    const raw = localStorage.getItem(LS_CHILD);
    if (!raw) return { name: '', surname: '' };
    return JSON.parse(raw);
  } catch {
    return { name: '', surname: '' };
  }
}
export function saveChild(name: string, surname: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_CHILD, JSON.stringify({ name: name.trim(), surname: surname.trim() }));
}
