import { useMemo, useState } from 'react';
import usePlannerStore from '../../store/usePlannerStore';
import { buildTree } from '../../utils/treeHelpers';

function filterTree(nodes, query) {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return nodes;

  function filterNode(node) {
    const filteredChildren = (node.children ?? [])
      .map(filterNode)
      .filter(Boolean);

    const isMatch =
      node.name.toLowerCase().includes(trimmed) ||
      node.type.toLowerCase().includes(trimmed);

    if (!isMatch && filteredChildren.length === 0) return null;

    return {
      ...node,
      children: filteredChildren,
    };
  }

  return nodes.map(filterNode).filter(Boolean);
}

function ConsumerTreeNode({
  node,
  depth,
  assignedTo,
  toggleAssign,
  collapsed,
  toggleCollapse,
}) {
  const hasChildren = node.children && node.children.length > 0;
  const isCollapsed = collapsed.has(node.id);

  return (
    <li>
      <div
        className="flex items-center gap-1 rounded-md py-1 pr-2 hover:bg-white"
        style={{ paddingLeft: `${depth * 8 + 4}px` }}
      >
        <button
          type="button"
          onClick={() => {
            if (hasChildren) toggleCollapse(node.id);
          }}
          className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded text-gray-400 ${hasChildren ? 'hover:bg-gray-200 hover:text-gray-600' : 'cursor-default'
            }`}
          tabIndex={hasChildren ? 0 : -1}
          aria-label={hasChildren ? `${isCollapsed ? 'Expand' : 'Collapse'} ${node.name}` : undefined}
        >
          {hasChildren ? (
            <svg
              className={`h-3 w-3 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          ) : (
            <span className="inline-block h-1 w-1 rounded-full bg-gray-300" />
          )}
        </button>

        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={assignedTo.has(node.id)}
            onChange={() => toggleAssign(node.id)}
            className="rounded border-gray-300 text-blue-500"
          />
          <span className="truncate text-xs text-gray-700">{node.name}</span>
          {/* <span
            className={`ml-auto rounded px-1 text-[10px] ${node.type === 'page' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'
              }`}
          >
            {node.type}
          </span> */}
        </label>
      </div>

      {hasChildren && !isCollapsed && (
        <ul>
          {node.children.map((child) => (
            <ConsumerTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              assignedTo={assignedTo}
              toggleAssign={toggleAssign}
              collapsed={collapsed}
              toggleCollapse={toggleCollapse}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function StateForm({ stateItem, onClose }) {
  const { components, updateState } = usePlannerStore();
  const [name, setName] = useState(stateItem.name);
  const [valueType, setValueType] = useState(stateItem.valueType);
  const [assignedTo, setAssignedTo] = useState(new Set(stateItem.assignedTo));
  const [collapsed, setCollapsed] = useState(new Set());
  const [componentSearch, setComponentSearch] = useState('');
  const componentTree = useMemo(() => buildTree(components), [components]);
  const filteredComponentTree = useMemo(
    () => filterTree(componentTree, componentSearch),
    [componentTree, componentSearch],
  );

  function toggleAssign(id) {
    setAssignedTo((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleCollapse(id) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) {
      updateState(stateItem.id, {
        name: trimmed,
        valueType: valueType.trim() || 'any',
        assignedTo: Array.from(assignedTo),
      });
    }
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="p-2 bg-gray-50 border border-gray-200 rounded-md space-y-2 mt-1">
      <div>
        <label className="text-xs text-gray-500 block mb-0.5">State name</label>
        <input
          autoFocus
          className="w-full text-sm border border-gray-300 rounded px-2 py-1 outline-none focus:border-blue-400"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 block mb-0.5">Value type</label>
        <select
          className="w-full text-sm border border-gray-300 rounded px-2 py-1 outline-none focus:border-blue-400"
          value={valueType}
          onChange={(e) => setValueType(e.target.value)}
        >
          <option value="object">Object</option>
          <option value="boolean">Boolean</option>
          <option value="string">String</option>
          <option value="number">Number</option>
          <option value="date">Date</option>
        </select>

      </div>
      <div>
        <label className="text-xs text-gray-500 block mb-1">Assign to components</label>
        <input
          className="w-full text-xs border border-gray-300 rounded px-2 py-1 outline-none focus:border-blue-400 mb-1"
          value={componentSearch}
          onChange={(e) => setComponentSearch(e.target.value)}
          placeholder="Search components..."
        />
        <div className="max-h-36 overflow-y-auto space-y-1">
          {filteredComponentTree.length === 0 ? (
            <p className="text-xs text-gray-400 italic text-center py-2">No matching components.</p>
          ) : (
            <ul>
              {filteredComponentTree.map((node) => (
                <ConsumerTreeNode
                  key={node.id}
                  node={node}
                  depth={0}
                  assignedTo={assignedTo}
                  toggleAssign={toggleAssign}
                  collapsed={collapsed}
                  toggleCollapse={toggleCollapse}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          className="flex-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded px-2 py-1 font-medium"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 rounded px-2 py-1"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
