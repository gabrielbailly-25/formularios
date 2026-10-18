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
}

export const CURSOS = ['4º EP', '5º EP', '6º EP', '1º ESO', '2º ESO', '3º ESO', '4º ESO', '1º Bach', '2º Bach'];

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
