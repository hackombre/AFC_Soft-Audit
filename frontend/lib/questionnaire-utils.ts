import type { ConditionRef, QuestionDef, QuestionnaireNode } from './types';

export type AnswerMap = Record<string, unknown>;

function answerEquals(value: unknown, expected: string): boolean {
  if (value == null) return false;
  if (typeof value === 'string') return value.toLowerCase() === expected.toLowerCase();
  if (typeof value === 'object' && 'value' in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>).value).toLowerCase() === expected.toLowerCase();
  }
  return String(value).toLowerCase() === expected.toLowerCase();
}

export function isQuestionVisible(q: QuestionDef, answers: AnswerMap): boolean {
  if (!q.conditionalOn) return true;
  const conds: ConditionRef[] = Array.isArray(q.conditionalOn) ? q.conditionalOn : [q.conditionalOn];
  return conds.every((c) => answerEquals(answers[c.questionId], c.value));
}

export interface FlatNode {
  path: string[]; // breadcrumb of labels, root -> this node
  node: QuestionnaireNode;
  depth: number;
}

/** Every node that has its own questions is a navigable "step" — including
 * nodes that ALSO have children (their own questions get shown, then the
 * children become further navigable sub-steps). Pure container nodes
 * (no questions of their own) are not directly navigable. */
export function flattenNavigable(
  sections: QuestionnaireNode[],
  path: string[] = [],
  depth = 0
): FlatNode[] {
  let out: FlatNode[] = [];
  for (const node of sections) {
    const here = [...path, node.label];
    if (node.questions.length > 0) {
      out.push({ path: here, node, depth });
    }
    if (node.children.length > 0) {
      out = out.concat(flattenNavigable(node.children, here, depth + 1));
    }
  }
  return out;
}

export function countVisibleAnswered(
  questions: QuestionDef[],
  answers: AnswerMap
): { total: number; answered: number } {
  const visible = questions.filter((q) => isQuestionVisible(q, answers));
  const answered = visible.filter((q) => {
    const v = answers[q.id];
    if (v == null) return false;
    if (typeof v === 'string') return v.trim() !== '';
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'object') return Object.keys(v as object).length > 0;
    return true;
  });
  return { total: visible.length, answered: answered.length };
}

/** Progress (0-100) for an entire node subtree (its own questions + all
 * descendants), used for the sidebar completion badges. */
export function subtreeProgress(node: QuestionnaireNode, answers: AnswerMap): number {
  let total = 0;
  let answered = 0;
  const walk = (n: QuestionnaireNode) => {
    const r = countVisibleAnswered(n.questions, answers);
    total += r.total;
    answered += r.answered;
    n.children.forEach(walk);
  };
  walk(node);
  if (total === 0) return 0;
  return Math.round((100 * answered) / total);
}
