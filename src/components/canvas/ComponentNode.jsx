import { memo, useState } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import usePlannerStore from '../../store/usePlannerStore';

const TAG_COLOR_CLASSES = {
  sky: 'bg-sky-100 text-sky-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  rose: 'bg-rose-100 text-rose-700',
  violet: 'bg-violet-100 text-violet-700',
  cyan: 'bg-cyan-100 text-cyan-700',
  lime: 'bg-lime-100 text-lime-700',
};

function ComponentNode({ id, data, selected }) {
  const { updateComponent, deleteComponent } = usePlannerStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.label);

  const isPage = data.type === 'page';
  const isRoot = data.isRoot;

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

      <div
        className={`
          w-full h-full flex flex-col items-center justify-center rounded-lg border-2 px-3 py-2 select-none
          ${isPage
            ? 'bg-indigo-50 border-indigo-400'
            : 'bg-white border-gray-300'}
          ${selected ? 'shadow-lg ring-2 ring-blue-400 ring-offset-1' : 'shadow-sm'}
        `}
      >
        {/* Type badge */}
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded mb-1
            ${isPage ? 'bg-indigo-200 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}
        >
          {isPage ? 'Page' : 'Component'}
        </span>

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

        {data.tags && data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 justify-center max-w-full">
            {data.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className={`text-[9px] px-1 py-0.5 rounded font-medium ${TAG_COLOR_CLASSES[tag.color] ?? TAG_COLOR_CLASSES.sky}`}
                title={tag.name}
              >
                {tag.name}
              </span>
            ))}
            {data.tags.length > 3 ? (
              <span className="text-[9px] px-1 py-0.5 rounded font-medium bg-gray-100 text-gray-600">
                +{data.tags.length - 3}
              </span>
            ) : null}
          </div>
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
