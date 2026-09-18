'use client';

import { useMemo, useState } from 'react';
import type {
  QuestionnaireNode,
  QuestionnaireStructure,
  QuestionDef,
} from '@/lib/types';
import {
  isQuestionVisible,
  questionDisplayNumber,
  type AnswerMap,
} from '@/lib/questionnaire-utils';

interface MissionReportProps {
  structure: QuestionnaireStructure;
  answers: AnswerMap;
  comments: Record<string, string>;
  missionName: string;
  onOpenQuestion: (nodeId: string) => void;
}

interface ReportQuestion {
  question: QuestionDef;
  node: QuestionnaireNode;
  number: number | null;
}

interface ReportNode {
  node: QuestionnaireNode;
  depth: number;
  questions: ReportQuestion[];
  answered: number;
  total: number;
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
    value === undefined ||
    value === ''
  ) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === 'object') {
    return Object.keys(
      value as Record<string, unknown>
    ).length > 0;
  }

  return true;
}

function flattenReportNodes(
  nodes: QuestionnaireNode[],
  answers: AnswerMap,
  output: ReportNode[] = []
): ReportNode[] {
  for (const node of nodes) {
    const visibleQuestions =
      node.questions.filter(
        (q) =>
          q.type !== 'label' &&
          isQuestionVisible(
            q,
            answers
          )
      );

    const numberedQuestions =
      node.questions.filter(
        (q) =>
          q.type !== 'label' &&
          isQuestionVisible(
            q,
            answers
          )
      );

    const questions: ReportQuestion[] =
      visibleQuestions.map(
        (question) => ({
          question,
          node,
          number:
            questionDisplayNumber(
              nodes,
              node.id,
              question.id,
              numberedQuestions,
              answers
            ),
        })
      );

    output.push({
      node,
      depth: node.id.split('.').length,
      questions,
      answered:
        questions.filter(
          (item) =>
            hasAnswer(
              answers[
                item.question.id
              ]
            )
        ).length,
      total: questions.length,
    });

    if (node.children?.length) {
      flattenReportNodes(
        node.children,
        answers,
        output
      );
    }
  }

  return output;
}

export default function MissionReport({
  structure,
  answers,
  comments,
  missionName,
  onOpenQuestion,
}: MissionReportProps) {
  const [editing, setEditing] =
    useState(false);

  const [summary, setSummary] =
    useState('');

  const reportNodes = useMemo(
    () =>
      flattenReportNodes(
        structure.sections,
        answers
      ),
    [structure, answers]
  );

  const statistics = useMemo(() => {
    let total = 0;
    let answered = 0;

    reportNodes.forEach((item) => {
      total += item.total;
      answered += item.answered;
    });

    return {
      total,
      answered,
      unanswered: Math.max(
        total - answered,
        0
      ),
    };
  }, [reportNodes]);

  const completion =
    statistics.total > 0
      ? Math.round(
          (statistics.answered /
            statistics.total) *
            100
        )
      : 0;

  return (
    <div className="max-w-5xl mx-auto">
      {/* En-tête du rapport */}
      <div
        className="rounded-2xl p-6 mb-5"
        style={{
          background:
            'linear-gradient(135deg, #eff6ff, #ffffff)',
          border:
            '1px solid #dbeafe',
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-wide"
              style={{
                color: '#2563eb',
              }}
            >
              Rapport de mission
            </p>

            <h1
              className="text-xl font-bold mt-1"
              style={{
                color: '#0f172a',
              }}
            >
              {missionName}
            </h1>

            <p
              className="text-sm mt-2"
              style={{
                color: '#64748b',
              }}
            >
              Synthèse des éléments, étapes,
              sous-étapes et réponses du
              questionnaire.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setEditing((value) => !value)
            }
            className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{
              background: editing
                ? '#f1f5f9'
                : '#2563eb',
              color: editing
                ? '#334155'
                : 'white',
              border: editing
                ? '1px solid #e2e8f0'
                : '1px solid #2563eb',
            }}
          >
            {editing
              ? 'Fermer l’édition'
              : 'Éditer le rapport'}
          </button>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div
            className="rounded-xl p-3"
            style={{
              background: 'white',
              border:
                '1px solid #e2e8f0',
            }}
          >
            <p
              className="text-xs"
              style={{
                color: '#64748b',
              }}
            >
              Questions
            </p>

            <p
              className="text-lg font-bold mt-1"
              style={{
                color: '#0f172a',
              }}
            >
              {statistics.total}
            </p>
          </div>

          <div
            className="rounded-xl p-3"
            style={{
              background: 'white',
              border:
                '1px solid #e2e8f0',
            }}
          >
            <p
              className="text-xs"
              style={{
                color: '#64748b',
              }}
            >
              Répondues
            </p>

            <p
              className="text-lg font-bold mt-1"
              style={{
                color: '#16a34a',
              }}
            >
              {statistics.answered}
            </p>
          </div>

          <div
            className="rounded-xl p-3"
            style={{
              background: 'white',
              border:
                '1px solid #e2e8f0',
            }}
          >
            <p
              className="text-xs"
              style={{
                color: '#64748b',
              }}
            >
              Avancement
            </p>

            <p
              className="text-lg font-bold mt-1"
              style={{
                color: '#2563eb',
              }}
            >
              {completion} %
            </p>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="mt-4">
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{
              background: '#e2e8f0',
            }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${completion}%`,
                background:
                  'linear-gradient(90deg, #2563eb, #4f9cf9)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Zone d'édition */}
      {editing && (
        <div
          className="rounded-2xl p-5 mb-5"
          style={{
            background: 'white',
            border:
              '1px solid #dbeafe',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2
                className="text-sm font-bold"
                style={{
                  color: '#0f172a',
                }}
              >
                Synthèse personnalisée
              </h2>

              <p
                className="text-xs mt-1"
                style={{
                  color: '#94a3b8',
                }}
              >
                Vous pouvez ajouter vos
                observations ou votre synthèse
                générale.
              </p>
            </div>
          </div>

          <textarea
            value={summary}
            onChange={(event) =>
              setSummary(
                event.target.value
              )
            }
            rows={7}
            placeholder="Saisissez ici la synthèse ou les observations générales de la mission..."
            className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-y"
            style={{
              border:
                '1px solid #cbd5e1',
              color: '#334155',
              background: '#f8fafd',
            }}
          />

          <div className="flex justify-end mt-3">
            <button
              type="button"
              onClick={() =>
                setEditing(false)
              }
              className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{
                background:
                  'linear-gradient(135deg, #2563eb, #4f9cf9)',
                color: 'white',
              }}
            >
              Enregistrer
            </button>
          </div>
        </div>
      )}

      {/* Synthèse personnalisée */}
      {summary.trim() && !editing && (
        <div
          className="rounded-2xl p-5 mb-5"
          style={{
            background: 'white',
            border:
              '1px solid #e2e8f0',
          }}
        >
          <h2
            className="text-sm font-bold mb-2"
            style={{
              color: '#0f172a',
            }}
          >
            Synthèse du rapport
          </h2>

          <p
            className="text-sm whitespace-pre-wrap leading-relaxed"
            style={{
              color: '#475569',
            }}
          >
            {summary}
          </p>
        </div>
      )}

      {/* Contenu */}
      <div className="space-y-4">
        {reportNodes.map(
          (reportNode) => {
            const {
              node,
              depth,
              questions,
              answered,
              total,
            } = reportNode;

            return (
              <section
                key={node.id}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: 'white',
                  border:
                    '1px solid #e2e8f0',
                }}
              >
                {/* Titre élément / étape */}
                <div
                  className="px-5 py-4"
                  style={{
                    background:
                      depth === 1
                        ? '#eff6ff'
                        : depth === 2
                          ? '#f8fafd'
                          : 'white',
                    borderBottom:
                      '1px solid #e2e8f0',
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs font-bold"
                          style={{
                            color:
                              '#2563eb',
                          }}
                        >
                          {node.id}
                        </span>

                        <h2
                          className={
                            depth === 1
                              ? 'text-base font-bold'
                              : depth === 2
                                ? 'text-sm font-bold'
                                : 'text-sm font-semibold'
                          }
                          style={{
                            color:
                              '#0f172a',
                          }}
                        >
                          {cleanLabel(
                            node.label
                          )}
                        </h2>
                      </div>
                    </div>

                    {total > 0 && (
                      <span
                        className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{
                          background:
                            answered ===
                            total
                              ? '#dcfce7'
                              : '#f1f5f9',
                          color:
                            answered ===
                            total
                              ? '#15803d'
                              : '#64748b',
                        }}
                      >
                        {answered}/{total}
                      </span>
                    )}
                  </div>
                </div>

                {/* Questions */}
                {questions.length > 0 && (
                  <div>
                    {questions.map(
                      ({
                        question,
                        number,
                      }) => {
                        const answer =
                          formatAnswer(
                            answers[
                              question.id
                            ]
                          );

                        const answeredQuestion =
                          hasAnswer(
                            answers[
                              question.id
                            ]
                          );

                        return (
                          <div
                            key={
                              question.id
                            }
                            className="px-5 py-4"
                            style={{
                              borderBottom:
                                '1px solid #f1f5f9',
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start gap-2">
                                  {number !=
                                    null && (
                                    <span
                                      className="shrink-0 inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-bold"
                                      style={{
                                        background:
                                          '#eff6ff',
                                        color:
                                          '#2563eb',
                                      }}
                                    >
                                      {number}
                                    </span>
                                  )}

                                  <p
                                    className="text-sm font-medium leading-relaxed"
                                    style={{
                                      color:
                                        '#1e293b',
                                    }}
                                  >
                                    {cleanLabel(
                                      question.label
                                    )}
                                  </p>
                                </div>

                                <div
                                  className="mt-2 rounded-xl px-3.5 py-3 text-sm whitespace-pre-wrap"
                                  style={{
                                    background:
                                      answeredQuestion
                                        ? '#f8fafd'
                                        : '#fff7ed',
                                    border:
                                      answeredQuestion
                                        ? '1px solid #eef2f7'
                                        : '1px solid #fed7aa',
                                    color:
                                      answeredQuestion
                                        ? '#334155'
                                        : '#c2410c',
                                  }}
                                >
                                  {answer}
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
                                        '3px solid #93c5fd',
                                      color:
                                        '#64748b',
                                    }}
                                  >
                                    <strong>
                                      Commentaire :
                                    </strong>{' '}
                                    {
                                      comments[
                                        question
                                          .id
                                      ]
                                    }
                                  </div>
                                )}
                              </div>

                              {/* Accès direct à la question */}
                              <button
                                type="button"
                                onClick={() =>
                                  onOpenQuestion(
                                    node.id
                                  )
                                }
                                title="Ouvrir et modifier cette question"
                                className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                                style={{
                                  background:
                                    '#eff6ff',
                                  border:
                                    '1px solid #bfdbfe',
                                  color:
                                    '#2563eb',
                                }}
                              >
                                →
                              </button>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                )}

                {questions.length ===
                  0 && (
                  <div
                    className="px-5 py-4 text-sm"
                    style={{
                      color: '#94a3b8',
                    }}
                  >
                    Aucune question
                    applicable dans cette
                    sous-étape.
                  </div>
                )}
              </section>
            );
          }
        )}
      </div>

      {reportNodes.length ===
        0 && (
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            background: 'white',
            border:
              '1px solid #e2e8f0',
          }}
        >
          <p
            className="text-sm"
            style={{
              color: '#64748b',
            }}
          >
            Aucun élément à afficher
            dans le rapport.
          </p>
        </div>
      )}
    </div>
  );
}