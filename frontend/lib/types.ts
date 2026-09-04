export type Role =
  | 'associe'
  | 'directeur_mission'
  | 'chef_mission'
  | 'auditeur_senior'
  | 'auditeur_junior';

export const ROLE_LABELS: Record<Role, string> = {
  associe: 'Associé',
  directeur_mission: 'Directeur de mission',
  chef_mission: 'Chef de mission',
  auditeur_senior: 'Auditeur senior',
  auditeur_junior: 'Auditeur junior',
};

export const ROLE_OPTIONS: { value: Role; label: string }[] = (
  Object.keys(ROLE_LABELS) as Role[]
).map((value) => ({ value, label: ROLE_LABELS[value] }));

export interface UserOut {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export interface Entity {
  id: string;
  name: string;
  raison_sociale: string | null;
  forme_juridique: string | null;
  rccm: string | null;
  niu: string | null;
  sigle: string | null;
  created_by: string;
  created_at: string;
}

export interface Mission {
  id: string;
  entity_id: string;
  entity_name: string | null;
  name: string;
  closing_date: string;
  fiscal_year: string | null;
  client_name: string | null;
  created_by: string;
  created_at: string;
  progress: number;
}

export type DocumentCategory = 'recus' | 'travaux';

export interface DocumentItem {
  id: string;
  mission_id: string;
  node_id: string;
  question_id: string | null;
  category: DocumentCategory;
  filename: string;
  content_type: string | null;
  size: number | null;
  uploaded_by: string | null;
  uploaded_at: string | null;
}

export type QuestionType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'radio'
  | 'radio_na'
  | 'select'
  | 'table'
  | 'checkbox_list'
  | 'collecte'
  | 'file';

export interface ConditionRef {
  questionId: string;
  value: string;
}

export interface QuestionDef {
  id: string;
  label: string;
  type: QuestionType;
  options?: string[];
  columns?: string[];
  withNA?: boolean;
  conditionalOn?: ConditionRef | ConditionRef[];
}

export interface QuestionnaireNode {
  id: string;
  label: string;
  questions: QuestionDef[];
  children: QuestionnaireNode[];
}

export interface QuestionnaireStructure {
  sections: QuestionnaireNode[];
  total_questions: number;
}

export interface AnswerOut {
  question_id: string;
  value: unknown;
  comment?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
}
