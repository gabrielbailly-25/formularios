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
}

export interface GleraResponse {
  id: string;
  formId: string;
  childName: string;
  childSurname: string;
  attends: 'si' | 'no';
  observation: string;
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
