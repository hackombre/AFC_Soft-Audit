'use client';

import type { QuestionnaireNode } from '@/lib/types';
import { subtreeProgress, type AnswerMap } from '@/lib/questionnaire-utils';

interface Props {
  nodes: QuestionnaireNode[];
  depth?: number;
  activeId: string;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  onSelect: (id: string) => void;
  answers: AnswerMap;
}

export default function QuestionnaireTree({
  nodes,
  depth = 0,
  activeId,
  expanded,
  onToggleExpand,
  onSelect,
  answers,
}: Props) {
  return (
    <div>
      {nodes.map((node) => {
        const hasChildren = node.children.length > 0;
        const isNavigable = node.questions.length > 0 || node.summary === 'conclusions';
        const isActive = node.id === activeId;
        const isExpanded = expanded.has(node.id);
        const progress = subtreeProgress(node, answers);

        return (
          <div key={node.id}>
            <button
              onClick={() => {
                if (isNavigable) onSelect(node.id);
                if (hasChildren) onToggleExpand(node.id);
              }}
              className="w-full flex items-center gap-2 text-left rounded-lg transition-all"
              style={{
                paddingLeft: `${16 + depth * 14}px`,
                paddingRight: '12px',
                paddingTop: depth === 0 ? '10px' : '8px',
                paddingBottom: depth === 0 ? '10px' : '8px',
                background: isActive ? '#eff6ff' : 'transparent',
                borderLeft: isActive ? '2px solid #3b82f6' : '2px solid transparent',
                marginLeft: depth > 0 ? '8px' : 0,
                width: depth > 0 ? 'calc(100% - 8px)' : '100%',
              }}
            >
              {hasChildren && (
                <svg
                  width={depth === 0 ? 13 : 11}
                  height={depth === 0 ? 13 : 11}
                  viewBox="0 0 12 12"
                  fill="none"
                  className="shrink-0 transition-transform"
                  style={{ color: '#94a3b8', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                >
                  <path d="M4 2.5l3.5 3.5L4 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {!hasChildren && <span style={{ width: depth === 0 ? 13 : 11 }} />}

              <span
                className="leading-snug flex-1 min-w-0 truncate"
                style={{
                  fontSize: depth === 0 ? '13px' : '12.5px',
                  fontWeight: depth === 0 ? 700 : isActive ? 600 : 400,
                  color: depth === 0 ? '#0f172a' : isActive ? '#1d4ed8' : '#475569',
                }}
              >
                {node.id}. {node.label}
              </span>

              {isNavigable && progress > 0 && progress < 100 && (
                <span className="ml-auto text-xs shrink-0" style={{ color: '#3b82f6' }}>{progress}%</span>
              )}
              {isNavigable && progress === 100 && (
                <span className="ml-auto shrink-0">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="5" fill="#16a34a" />
                    <path d="M3.5 6l2 2 3-3" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              )}
            </button>

            {hasChildren && isExpanded && (
              <QuestionnaireTree
                nodes={node.children}
                depth={depth + 1}
                activeId={activeId}
                expanded={expanded}
                onToggleExpand={onToggleExpand}
                onSelect={onSelect}
                answers={answers}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
