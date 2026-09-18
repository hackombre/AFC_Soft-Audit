'use client';

import { useMemo } from 'react';

import type {
DocumentItem,
QuestionDef,
QuestionnaireNode,
QuestionnaireStructure,
} from '@/lib/types';

import {
isQuestionVisible,
type AnswerMap,
} from '@/lib/questionnaire-utils';

interface CommentState {
[questionId: string]: string;
}

interface MissionReportProps {
structure: QuestionnaireStructure;
answers: AnswerMap;
comments: CommentState;
documents: DocumentItem[];
onEditQuestion: (
nodeId: string,
questionId: string
) => void;
}

function cleanLabel(label: string): string {
return label
.replace(/\s+[A-Z]-[\w.-]+$/u, '')
.trim();
}

function formatAnswer(value: unknown): string {
if (
value === null ||
value === undefined ||
value === ''
) {
return 'Pas de réponse';
}

if (Array.isArray(value)) {
if (!value.length) {
return 'Pas de réponse';
}


return value
  .map((item) => formatAnswer(item))
  .join(', ');


}

if (typeof value === 'object') {
const entries = Object.entries(
value as Record<string, unknown>
);


if (!entries.length) {
  return 'Pas de réponse';
}

return entries
  .map(
    ([key, item]) =>
      `${key}: ${formatAnswer(item)}`
  )
  .join(' ; ');


}

return String(value);
}

function hasAnswer(value: unknown): boolean {
if (
value === null ||
value === undefined
) {
return false;
}

if (typeof value === 'string') {
return value.trim().length > 0;
}

if (Array.isArray(value)) {
return value.length > 0;
}

if (typeof value === 'object') {
return (
Object.keys(
value as Record<string, unknown>
).length > 0
);
}

return true;
}

function nodeDepth(id: string): number {
return id.split('.').length;
}

function collectStats(
nodes: QuestionnaireNode[],
answers: AnswerMap
) {
let elements = 0;
let steps = 0;
let subSteps = 0;
let questions = 0;
let answered = 0;

function walk(
currentNodes: QuestionnaireNode[]
) {
currentNodes.forEach((node) => {
const depth = nodeDepth(node.id);


  elements += 1;

  if (depth === 1) {
    steps += 1;
  } else {
    subSteps += 1;
  }

  node.questions.forEach(
    (question) => {
      if (question.type === 'label') {
        return;
      }

      questions += 1;

      if (
        hasAnswer(
          answers[question.id]
        )
      ) {
        answered += 1;
      }
    }
  );

  if (node.children.length) {
    walk(node.children);
  }
});


}

walk(nodes);

return {
elements,
steps,
subSteps,
questions,
answered,
unanswered:
questions - answered,
};
}

interface NodeBlockProps {
node: QuestionnaireNode;
answers: AnswerMap;
comments: CommentState;
documents: DocumentItem[];
onEditQuestion: (
nodeId: string,
questionId: string
) => void;
level?: number;
}

function NodeBlock({
node,
answers,
comments,
documents,
onEditQuestion,
level = 1,
}: NodeBlockProps) {
const visibleQuestions =
node.questions.filter(
(question) =>
isQuestionVisible(
question,
answers
)
);

const realQuestions =
visibleQuestions.filter(
(question) =>
question.type !== 'label'
);

const questionCount =
realQuestions.length;

const answeredCount =
realQuestions.filter(
(question) =>
hasAnswer(
answers[question.id]
)
).length;

return (
<div
className={
level === 1
? 'mb-8'
: level === 2
? 'mb-6 ml-3'
: 'mb-5 ml-5'
}
>
<div
className="rounded-2xl overflow-hidden"
style={{
border:
level === 1
? '1px solid #dbeafe'
: '1px solid #e2e8f0',
background:
level === 1
? '#f8fbff'
: '#ffffff',
}}
>
<div
className="px-5 py-4"
style={{
background:
level === 1
? '#eff6ff'
: '#f8fafc',
borderBottom:
'1px solid #e2e8f0',
}}
> <div className="flex items-start justify-between gap-4"> <div className="min-w-0">
<div
className="text-[10px] font-bold uppercase tracking-wider mb-1"
style={{
color: '#2563eb',
}}
>
{level === 1
? 'ÉLÉMENT'
: level === 2
? 'ÉTAPE'
: 'SOUS-ÉTAPE'} </div>


          <h3
            className={
              level === 1
                ? 'text-base font-bold'
                : 'text-sm font-semibold'
            }
            style={{
              color: '#0f172a',
            }}
          >
            {node.id}.{' '}
            {cleanLabel(
              node.label
            )}
          </h3>
        </div>

        <div
          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold"
          style={{
            color:
              questionCount > 0 &&
              answeredCount ===
                questionCount
                ? '#15803d'
                : '#64748b',
            background:
              questionCount > 0 &&
              answeredCount ===
                questionCount
                ? '#f0fdf4'
                : '#ffffff',
            border:
              '1px solid #e2e8f0',
          }}
        >
          {answeredCount}/
          {questionCount} répondu
        </div>
      </div>
    </div>

    <div>
      {visibleQuestions.map(
        (question) => {
          if (
            question.type === 'label'
          ) {
            return (
              <div
                key={question.id}
                className="px-5 py-3"
                style={{
                  borderBottom:
                    '1px solid #f1f5f9',
                  background:
                    '#ffffff',
                }}
              >
                <p
                  className="text-sm font-semibold leading-relaxed"
                  style={{
                    color: '#334155',
                  }}
                >
                  {cleanLabel(
                    question.label
                  )}
                </p>

                {question.guide_files
                  ?.length ? (
                  <p
                    className="text-xs mt-1"
                    style={{
                      color: '#64748b',
                    }}
                  >
                    {question.guide_files.length}{' '}
                    modèle(s) associé(s)
                  </p>
                ) : null}
              </div>
            );
          }

          const answered =
            hasAnswer(
              answers[
                question.id
              ]
            );

          const questionDocuments =
            documents.filter(
              (document) =>
                document.question_id ===
                question.id
            );

          return (
            <div
              key={question.id}
              id={`report-question-${question.id}`}
              className="px-5 py-4"
              style={{
                borderBottom:
                  '1px solid #f1f5f9',
              }}
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <span
                      className="shrink-0 inline-flex items-center justify-center rounded-md px-2 py-1 text-[10px] font-bold"
                      style={{
                        background:
                          '#eff6ff',
                        color:
                          '#2563eb',
                      }}
                    >
                      {question.id}
                    </span>

                    <p
                      className="text-sm font-medium leading-relaxed"
                      style={{
                        color:
                          '#0f172a',
                      }}
                    >
                      {cleanLabel(
                        question.label
                      )}
                    </p>
                  </div>

                  <div
                    className="mt-3 rounded-lg px-3 py-2.5 text-sm whitespace-pre-wrap"
                    style={{
                      background:
                        answered
                          ? '#f8fafc'
                          : '#fff7ed',
                      border:
                        '1px solid #e2e8f0',
                      color:
                        answered
                          ? '#334155'
                          : '#9a3412',
                    }}
                  >
                    {formatAnswer(
                      answers[
                        question.id
                      ]
                    )}
                  </div>

                  {comments[
                    question.id
                  ] && (
                    <div
                      className="mt-2 rounded-lg px-3 py-2 text-xs"
                      style={{
                        background:
                          '#f8fafc',
                        borderLeft:
                          '3px solid #2563eb',
                        color:
                          '#475569',
                      }}
                    >
                      <strong>
                        Commentaire :
                      </strong>{' '}
                      {
                        comments[
                          question.id
                        ]
                      }
                    </div>
                  )}

                  {questionDocuments.length >
                    0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {questionDocuments.map(
                        (document) => (
                          <span
                            key={
                              document.id
                            }
                            className="text-xs"
                            style={{
                              color:
                                '#2563eb',
                            }}
                          >
                            📎{' '}
                            {
                              document.filename
                            }
                          </span>
                        )
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onEditQuestion(
                      node.id,
                      question.id
                    )
                  }
                  className="shrink-0 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold"
                  style={{
                    color:
                      '#2563eb',
                    background:
                      '#eff6ff',
                    border:
                      '1px solid #bfdbfe',
                  }}
                  title="Modifier cette question"
                >
                  <span>
                    Modifier
                  </span>

                  <span
                    aria-hidden="true"
                    className="text-base leading-none"
                  >
                    →
                  </span>
                </button>
              </div>
            </div>
          );
        }
      )}
    </div>
  </div>

  {node.children.length > 0 && (
    <div className="mt-5">
      {node.children.map(
        (child) => (
          <NodeBlock
            key={child.id}
            node={child}
            answers={answers}
            comments={comments}
            documents={documents}
            onEditQuestion={
              onEditQuestion
            }
            level={Math.min(
              level + 1,
              3
            )}
          />
        )
      )}
    </div>
  )}
</div>


);
}

export default function MissionReport({
structure,
answers,
comments,
documents,
onEditQuestion,
}: MissionReportProps) {
const stats = useMemo(
() =>
collectStats(
structure.sections,
answers
),
[structure.sections, answers]
);

return ( <div className="max-w-5xl mx-auto pb-10">
<div
className="rounded-2xl p-6 mb-6"
style={{
background:
'linear-gradient(135deg, #eff6ff, #ffffff)',
border:
'1px solid #dbeafe',
}}
> <div className="flex items-start justify-between gap-6"> <div>
<p
className="text-xs font-bold uppercase tracking-wider"
style={{
color: '#2563eb',
}}
>
Rapport de mission </p>


        <h2
          className="text-xl font-bold mt-1"
          style={{
            color: '#0f172a',
          }}
        >
          Synthèse des
          questions-réponses
        </h2>

        <p
          className="text-sm mt-2"
          style={{
            color: '#64748b',
          }}
        >
          Résumé de tous les éléments,
          étapes, sous-étapes et
          questions de la mission.
        </p>
      </div>

      <div
        className="shrink-0 rounded-xl px-5 py-3 text-center"
        style={{
          background: '#ffffff',
          border:
            '1px solid #dbeafe',
        }}
      >
        <div
          className="text-2xl font-bold"
          style={{
            color: '#2563eb',
          }}
        >
          {stats.answered}
        </div>

        <div
          className="text-xs"
          style={{
            color: '#64748b',
          }}
        >
          réponses
        </div>
      </div>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
      <Stat
        label="Éléments"
        value={stats.elements}
      />

      <Stat
        label="Étapes"
        value={stats.steps}
      />

      <Stat
        label="Sous-étapes"
        value={stats.subSteps}
      />

      <Stat
        label="Questions"
        value={stats.questions}
      />

      <Stat
        label="Non répondues"
        value={stats.unanswered}
        warning={
          stats.unanswered > 0
        }
      />
    </div>
  </div>

  <div
    className="rounded-xl px-4 py-3 mb-6 text-sm"
    style={{
      background: '#f8fafc',
      border:
        '1px solid #e2e8f0',
      color: '#475569',
    }}
  >
    <strong>
      Modification :
    </strong>{' '}
    cliquez sur{' '}
    <strong>
      « Modifier → »
    </strong>{' '}
    pour revenir directement à
    l'étape de la question et
    modifier sa réponse.
  </div>

  {structure.sections.map(
    (section) => (
      <NodeBlock
        key={section.id}
        node={section}
        answers={answers}
        comments={comments}
        documents={documents}
        onEditQuestion={
          onEditQuestion
        }
      />
    )
  )}
</div>


);
}

function Stat({
label,
value,
warning = false,
}: {
label: string;
value: number;
warning?: boolean;
}) {
return (
<div
className="rounded-xl px-3 py-3"
style={{
background: '#ffffff',
border:
'1px solid #e2e8f0',
}}
>
<div
className="text-lg font-bold"
style={{
color: warning
? '#ea580c'
: '#0f172a',
}}
>
{value} </div>


  <div
    className="text-[11px] mt-0.5"
    style={{
      color: '#64748b',
    }}
  >
    {label}
  </div>
</div>


);
}
