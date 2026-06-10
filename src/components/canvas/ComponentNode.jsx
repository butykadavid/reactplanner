import { memo, useState } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import usePlannerStore from '../../store/usePlannerStore';

const GROUP_DOT_COLORS = {
  sky: '#0ea5e9',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  violet: '#8b5cf6',
  cyan: '#06b6d4',
  lime: '#84cc16',
};

function ComponentNode({ id, data, selected }) {
  const { updateComponent, deleteComponent } = usePlannerStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.label);

  const isPage = data.type === 'page';
  const isRoot = data.isRoot;
  const isDeckComponent = data.isDeckComponent;
  const groups = data.groups ?? [];
  const groupDotColors = groups
    .map((group) => GROUP_DOT_COLORS[group.color] ?? GROUP_DOT_COLORS.sky);
  const groupNames = groups.map((group) => group.name).join(', ');

  function commitRename() {
    const trimmed = draft.trim();
    if (trimmed) updateComponent(id, { name: trimmed });
    setEditing(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') commitRename();
    if (e.key === 'Escape') {
      setDraft(data.label);
      setEditing(false);
    }
  }

  return (
    <>
      <NodeResizer
        minWidth={160}
        minHeight={60}
        isVisible={selected}
        lineClassName="border-blue-400"
        handleClassName="w-2 h-2 bg-white border border-blue-400 rounded-sm"
        onResize={(_, params) =>
          updateComponent(id, { size: { width: params.width, height: params.height } })
        }
      />

      {/* Top handle (accept children dropping onto this node) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-gray-400 !border-gray-500"
        isConnectable={true}
      />

      <div className="relative w-full h-full">
        <div
          className={`
            relative w-full h-full flex flex-col items-center justify-center rounded-lg border-2 px-3 py-2 select-none
            ${isPage
              ? 'bg-indigo-50 border-indigo-400'
              : isDeckComponent
                ? 'bg-amber-50 border-amber-300'
                : 'bg-white border-gray-300'}
            ${selected ? 'shadow-lg ring-2 ring-blue-400 ring-offset-1' : 'shadow-sm'}
          `}
        >
          {groups.length > 0 && (
            <div
              className="absolute top-1 left-1 flex items-center gap-1"
              title={groupNames}
            >
              {groupDotColors.map((color, index) => (
                <span
                  key={`${groups[index].id}-${index}`}
                  className="w-2 h-2 rounded-full border border-white/80"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          )}

          {/* Type badge */}
          {/* <span
          className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded mb-1
            ${isPage
              ? 'bg-indigo-200 text-indigo-700'
              : isDeckComponent
                ? 'bg-amber-100 text-amber-700'
                : 'bg-gray-100 text-gray-500'}`}
        >
          {isPage ? 'Page' : 'Component'}
        </span> */}

          {/* Name (double-click to rename) */}
          {editing ? (
            <input
              autoFocus
              className="text-sm font-semibold text-center border border-blue-300 rounded px-1 w-full outline-none"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={handleKeyDown}
            />
          ) : (
            <span
              className="text-sm font-semibold text-gray-800 truncate max-w-full cursor-text"
              onDoubleClick={() => {
                setDraft(data.label);
                setEditing(true);
              }}
              title="Double-click to rename"
            >
              {data.label}
            </span>
          )}

          {/* State scope badges */}
          {data.scopeBadges && data.scopeBadges.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1 justify-center">
              {data.scopeBadges.map((badge) => (
                <span
                  key={badge.stateId}
                  className={`text-[9px] px-1 py-0.5 rounded font-medium ${badge.colorClass}`}
                  title={`${badge.stateName}: ${badge.scopeLabel}`}
                >
                  {badge.stateName}
                </span>
              ))}
            </div>
          )}

          {/* Delete button — hidden for root */}
          {!isRoot && (
            <button
              className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center rounded-full text-gray-400 hover:bg-red-100 hover:text-red-500 text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                deleteComponent(id);
              }}
              title="Delete component"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-gray-400 !border-gray-500"
        isConnectable={true}
      />
    </>
  );
}

export default memo(ComponentNode);
