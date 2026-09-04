'use client';

import type { QuestionnaireNode } from '@/lib/types';

interface Props {
  nodes: QuestionnaireNode[];
  depth?: number;
  activeId: string;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  onSelect: (id: string) => void;
  countByNode: Record<string, number>;
}

function FolderIcon({ open, hasFiles }: { open: boolean; hasFiles: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <path
        d="M2 4.5a1 1 0 011-1h3.2l1.3 1.5H13a1 1 0 011 1V12a1 1 0 01-1 1H3a1 1 0 01-1-1V4.5z"
        fill={open || hasFiles ? '#dbeafe' : '#f1f5f9'}
        stroke={open || hasFiles ? '#2563eb' : '#cbd5e1'}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function FolderTree({
  nodes,
  depth = 0,
  activeId,
  expanded,
  onToggleExpand,
  onSelect,
  countByNode,
}: Props) {
  return (
    <div>
      {nodes.map((node) => {
        const hasChildren = node.children.length > 0;
        const isActive = node.id === activeId;
        const isExpanded = expanded.has(node.id);
        const count = countByNode[node.id] ?? 0;

        return (
          <div key={node.id}>
            <button
              onClick={() => {
                onSelect(node.id);
                if (hasChildren) onToggleExpand(node.id);
              }}
              className="w-full flex items-center gap-2 text-left rounded-lg transition-all"
              style={{
                paddingLeft: `${14 + depth * 14}px`,
                paddingRight: '10px',
                paddingTop: '7px',
                paddingBottom: '7px',
                background: isActive ? '#eff6ff' : 'transparent',
              }}
            >
              {hasChildren ? (
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 12 12"
                  fill="none"
                  className="shrink-0 transition-transform"
                  style={{ color: '#94a3b8', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                >
                  <path d="M4 2.5l3.5 3.5L4 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <span style={{ width: 11 }} />
              )}

              <FolderIcon open={isActive} hasFiles={count > 0} />

              <span
                className="leading-snug flex-1 min-w-0 truncate text-xs"
                style={{
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#1d4ed8' : '#334155',
                }}
              >
                {node.id}. {node.label}
              </span>

              {count > 0 && (
                <span
                  className="ml-auto shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: isActive ? '#2563eb' : '#eef2f7', color: isActive ? 'white' : '#64748b' }}
                >
                  {count}
                </span>
              )}
            </button>

            {hasChildren && isExpanded && (
              <FolderTree
                nodes={node.children}
                depth={depth + 1}
                activeId={activeId}
                expanded={expanded}
                onToggleExpand={onToggleExpand}
                onSelect={onSelect}
                countByNode={countByNode}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
