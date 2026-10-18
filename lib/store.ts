import { collection, doc, getDocs, setDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { getDb, isFirebaseConfigured } from './firebase';
import { GleraForm, GleraResponse } from './types';

// Almacenamiento: Firestore si hay config, si no localStorage (modo demo local).
// IMPORTANTE: si Firebase está configurado, los errores de Firestore NO se ocultan:
// se propagan para que la interfaz los muestre en vez de fingir que todo fue bien
// (un fallo silencioso haría "desaparecer" formularios y respuestas).

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

function useFirestore(): boolean {
  return isFirebaseConfigured();
}

function requireDb() {
  const db = getDb();
  if (!db) throw new Error('Firebase no está configurado correctamente');
  return db;
}

export async function listForms(): Promise<GleraForm[]> {
  if (useFirestore()) {
    const db = requireDb();
    const snap = await getDocs(query(collection(db, 'glera_forms'), orderBy('createdAt', 'desc')));
    return snap.docs.map(d => d.data() as GleraForm);
  }
  return readLS<GleraForm>(LS_FORMS).sort((a, b) => b.createdAt - a.createdAt);
}

export async function getForm(id: string): Promise<GleraForm | null> {
  const all = await listForms();
  return all.find(f => f.id === id) || null;
}

export async function saveForm(form: GleraForm): Promise<void> {
  if (useFirestore()) {
    const db = requireDb();
    await setDoc(doc(db, 'glera_forms', form.id), form);
    return;
  }
  const all = readLS<GleraForm>(LS_FORMS);
  const idx = all.findIndex(f => f.id === form.id);
  if (idx >= 0) all[idx] = form; else all.unshift(form);
  writeLS(LS_FORMS, all);
}

export async function deleteForm(id: string): Promise<void> {
  if (useFirestore()) {
    const db = requireDb();
    await deleteDoc(doc(db, 'glera_forms', id));
    // borra también respuestas
    const res = await listResponses(id);
    for (const r of res) {
      await deleteDoc(doc(db, 'glera_responses', r.id));
    }
    return;
  }
  writeLS(LS_FORMS, readLS<GleraForm>(LS_FORMS).filter(f => f.id !== id));
  writeLS(LS_RESP, readLS<GleraResponse>(LS_RESP).filter(r => r.formId !== id));
}

export async function listResponses(formId: string): Promise<GleraResponse[]> {
  if (useFirestore()) {
    const db = requireDb();
    // OJO: esta consulta necesita el índice compuesto (formId ASC, createdAt DESC)
    // en Firestore → Índices. Sin él, Firestore lanza un error (ya no se oculta).
    const snap = await getDocs(query(collection(db, 'glera_responses'), where('formId', '==', formId), orderBy('createdAt', 'desc')));
    return snap.docs.map(d => d.data() as GleraResponse);
  }
  return readLS<GleraResponse>(LS_RESP).filter(r => r.formId === formId).sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveResponse(resp: GleraResponse): Promise<void> {
  if (useFirestore()) {
    const db = requireDb();
    await setDoc(doc(db, 'glera_responses', resp.id), resp);
    return;
  }
  const all = readLS<GleraResponse>(LS_RESP);
  all.unshift(resp);
  writeLS(LS_RESP, all);
}

export async function deleteResponse(id: string): Promise<void> {
  if (useFirestore()) {
    const db = requireDb();
    await deleteDoc(doc(db, 'glera_responses', id));
    return;
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
