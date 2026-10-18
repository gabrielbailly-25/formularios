export type QuestionType = 'text' | 'textarea' | 'number' | 'yesno' | 'radio' | 'checkbox' | 'select';

export interface Question {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  options: string[];
  placeholder?: string;
}

export interface GleraForm {
  id: string;
  title: string;
  headerImage: string; // data URL o URL
  descriptionHtml: string;
  questions: Question[];
  status: 'open' | 'closed';
  createdAt: number;
  // fecha del plan (opcional, texto libre)
  planDate?: string;
  planPlace?: string;
  // texto de autorización personalizable (opcional): si se rellena, la familia
  // debe marcar la casilla de autorización para poder enviar el formulario
  authText?: string;
  // 'simple' (solo casilla) o 'full' (pide nombre y DNI de quien autoriza + cláusula de datos)
  authType?: 'simple' | 'full';
}

export const CURSOS = ['4º EP', '5º EP', '6º EP', '1º ESO', '2º ESO', '3º ESO', '4º ESO', '1º Bach', '2º Bach'];

// Cláusula de protección de datos que acompaña a la autorización completa
export const DATA_CLAUSE = 'Protección de datos: los datos recogidos en este formulario (nombre y curso del hijo, nombre y DNI de quien autoriza) se usarán únicamente para la gestión de este plan de la Asociación Juvenil Glera y no se cederán a terceros. Puedes ejercer tus derechos de acceso, rectificación y supresión escribiendo a la Asociación Juvenil Glera.';

export interface GleraResponse {
  id: string;
  formId: string;
  childName: string;
  childSurname: string;
  curso: string;
  attends: 'si' | 'no';
  observation: string;
  // true si la familia marcó la casilla de autorización (solo cuando el formulario la pide)
  authorized?: boolean;
  // quién autoriza (solo en autorización completa)
  authByName?: string;
  authByDni?: string;
  answers: Record<string, any>;
  createdAt: number;
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function formatDate(ts: number): string {
  try {
    return new Date(ts).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}
