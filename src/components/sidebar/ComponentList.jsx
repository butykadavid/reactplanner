import { useMemo, useState } from 'react';
import usePlannerStore from '../../store/usePlannerStore';
import { buildTree } from '../../utils/treeHelpers';
import ComponentForm from './ComponentForm';

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

function TreeNode({
  node,
  depth,
  editingId,
  setEditingId,
  collapsed,
  toggleCollapse,
  deleteComponent,
  rootId,
  selectedComponentId,
  onSelectComponent,
  wrapperDeckById,
  onAddChild,
}) {
  const hasChildren = node.children && node.children.length > 0;
  const isCollapsed = collapsed.has(node.id);
  const isRoot = node.id === rootId;
  const isSelected = selectedComponentId === node.id;
  const wrapperDeck = wrapperDeckById[node.id] ?? null;

  return (
    <li>
      <div
        className={`flex items-center gap-1 pr-2 py-1 rounded-md cursor-pointer group hover:bg-gray-100
          ${editingId === node.id || isSelected ? 'bg-gray-100' : ''}`}
        style={{ paddingLeft: `${depth * 8 + 4}px` }}
        onClick={() => onSelectComponent(node.id)}
        onDoubleClick={() => setEditingId(editingId === node.id ? null : node.id)}
        title="Click to show details · Double-click to edit"
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) toggleCollapse(node.id);
          }}
          className={`w-4 h-4 flex items-center justify-center flex-shrink-0 rounded text-gray-400
            ${hasChildren ? 'hover:text-gray-600 hover:bg-gray-200' : 'cursor-default'}`}
          tabIndex={-1}
        >
          {hasChildren ? (
            <svg
              className={`w-3 h-3 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          ) : (
            <span className="w-1 h-1 rounded-full bg-gray-300 inline-block" />
          )}
        </button>

        <span className={`w-2 h-2 rounded-full flex-shrink-0
          ${node.type === 'page' ? 'bg-indigo-400' : (wrapperDeck ? 'bg-amber-400' : 'bg-gray-400')}`}
        />

        <span className="text-sm text-gray-700 flex-1 truncate">{node.name}</span>

        {/* <span className={`text-[10px] px-1 rounded flex-shrink-0
          ${node.type === 'page' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
          {node.type}
        </span> */}

        {/* {memberDeck ? (
          <span className="text-[10px] px-1 rounded flex-shrink-0 bg-sky-100 text-sky-700 border border-sky-200 max-w-24 truncate">
            {memberDeck.name}
          </span>
        ) : null}

        {wrapperDeck ? (
          <span className="text-[10px] px-1 rounded flex-shrink-0 bg-amber-100 text-amber-700 border border-amber-200">
            deck
          </span>
        ) : null} */}

        <button
          onClick={(e) => {
            e.stopPropagation();
            setEditingId(editingId === node.id ? null : node.id);
          }}
          className="w-4 h-4 flex items-center justify-center text-gray-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold flex-shrink-0"
          title="Edit"
        >
          ✎
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddChild(node.id);
          }}
          className="w-4 h-4 flex items-center justify-center text-gray-300 hover:text-green-500 opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold flex-shrink-0"
          title="Add child"
        >
          +
        </button>

        {!isRoot && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteComponent(node.id);
              if (editingId === node.id) setEditingId(null);
              if (selectedComponentId === node.id) onSelectComponent(null);
            }}
            className="w-4 h-4 flex items-center justify-center text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold flex-shrink-0"
            title="Delete"
          >
            ×
          </button>
        )}
      </div>

      {editingId === node.id && (
        <div style={{ paddingLeft: `${depth * 8 + 4}px` }}>
          <ComponentForm comp={node} onClose={() => setEditingId(null)} />
        </div>
      )}

      {hasChildren && !isCollapsed && (
        <ul>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              editingId={editingId}
              setEditingId={setEditingId}
              collapsed={collapsed}
              toggleCollapse={toggleCollapse}
              deleteComponent={deleteComponent}
              rootId={rootId}
              selectedComponentId={selectedComponentId}
              onSelectComponent={onSelectComponent}
              wrapperDeckById={wrapperDeckById}
              onAddChild={onAddChild}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function ComponentList({
  selectedComponentId,
  onSelectComponent,
  visibleComponentIds,
  showFilters,
  onShowFiltersChange,
  applyGroupFilter,
  onApplyGroupFilterChange,
  groupFilterId,
  onGroupFilterIdChange,
  applyStateFilter,
  onApplyStateFilterChange,
  stateFilterId,
  onStateFilterIdChange,
  applySubtreeFilter,
  onApplySubtreeFilterChange,
  subtreeFilterRootId,
  onSubtreeFilterRootIdChange,
}) {
  const { components, decks, groups, states, addComponent, deleteComponent, createDeck } = usePlannerStore();
  const [editingId, setEditingId] = useState(null);
  const [collapsed, setCollapsed] = useState(new Set());
  const [search, setSearch] = useState('');
  const [showAddButtons, setShowAddButtons] = useState(false);
  const [creatingDeck, setCreatingDeck] = useState(false);
  const [deckName, setDeckName] = useState('');
  const [deckType, setDeckType] = useState('component');

  const visibleComponents = useMemo(
    () => components.filter((component) => visibleComponentIds.has(component.id)),
    [components, visibleComponentIds],
  );
  const roots = buildTree(visibleComponents);
  const filteredRoots = useMemo(() => filterTree(roots, search), [roots, search]);
  const rootId = components.find((c) => c.parentId === null)?.id;

  const wrapperDeckById = useMemo(
    () => Object.fromEntries(decks.map((deck) => [deck.wrapperId, deck])),
    [decks],
  );

  function toggleCollapse(id) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleOpenAddButtons() {
    setShowAddButtons((prev) => !prev);
  }

  function handleAdd(type) {
    const newId = addComponent({
      type,
      name: type === 'page' ? 'NewPage' : 'NewComponent',
      position: { x: 80 + Math.random() * 200, y: 200 + Math.random() * 150 },
      parentId: selectedComponentId || undefined,
    });

    if (!newId) return;

    setEditingId(newId);
    onSelectComponent(newId);
  }

  function handleAddChild(parentId) {
    const newId = addComponent({
      type: 'component',
      name: 'NewComponent',
      position: { x: 80 + Math.random() * 200, y: 200 + Math.random() * 150 },
      parentId,
    });

    if (!newId) return;

    setEditingId(newId);
    onSelectComponent(newId);
  }

  function handleCreateDeck(e) {
    e.preventDefault();
    const created = createDeck({
      name: deckName,
      memberType: deckType,
    });

    if (!created) return;

    setCreatingDeck(false);
    setDeckName('');
    setDeckType('component');
    onSelectComponent(created.wrapperId);
    setEditingId(created.wrapperId);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Components</span>
        <div className="flex gap-1">
          <div className="relative">
            <button
              className="text-xs pb-1 font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 rounded px-2 py-0.5"
              onClick={() => handleOpenAddButtons()}>
              +
            </button>
            <div className={`absolute right-0 mt-1 flex flex-col gap-1 p-2 z-10 bg-white border border-gray-200 rounded shadow-lg
              ${showAddButtons ? 'block' : 'hidden'}`}
            >
              <button
                onClick={() => handleAdd('component')}
                className="text-xs bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-600 border border-gray-200 rounded px-2 py-0.5"
              >
                component
              </button>
              <button
                onClick={() => handleAdd('page')}
                className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 rounded px-2 py-0.5"
              >
                page
              </button>
              <button
                onClick={() => setCreatingDeck((prev) => !prev)}
                className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded px-2 py-0.5"
              >
                deck
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-2 space-y-2">
        <input
          className="w-full text-xs border border-gray-300 rounded px-2 py-1 outline-none focus:border-blue-400"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search components..."
        />

        <div className="p-2 rounded-md border border-gray-200 bg-gray-50 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">Filter</label>
            <button
              type="button"
              onClick={() => onShowFiltersChange(!showFilters)}
              className="text-[10px] px-1.5 py-0.5 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-100"
            >
              {showFilters ? 'Hide' : 'Show'}
            </button>
          </div>

          {showFilters ? (
            <>
              <label className="flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={applyGroupFilter}
                  onChange={(e) => onApplyGroupFilterChange(e.target.checked)}
                />
                Group
              </label>
              {applyGroupFilter ? (
                <select
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1 outline-none focus:border-blue-400 bg-white"
                  value={groupFilterId}
                  onChange={(e) => onGroupFilterIdChange(e.target.value)}
                >
                  <option value="">Select group</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              ) : null}

              <label className="flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={applyStateFilter}
                  onChange={(e) => onApplyStateFilterChange(e.target.checked)}
                />
                State can-consume subtree
              </label>
              {applyStateFilter ? (
                <select
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1 outline-none focus:border-blue-400 bg-white"
                  value={stateFilterId}
                  onChange={(e) => onStateFilterIdChange(e.target.value)}
                >
                  <option value="">Select state</option>
                  {states.map((state) => (
                    <option key={state.id} value={state.id}>
                      {state.name}
                    </option>
                  ))}
                </select>
              ) : null}

              <label className="flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={applySubtreeFilter}
                  onChange={(e) => onApplySubtreeFilterChange(e.target.checked)}
                />
                Selected component subtree
              </label>
              {applySubtreeFilter ? (
                <select
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1 outline-none focus:border-blue-400 bg-white"
                  value={subtreeFilterRootId}
                  onChange={(e) => onSubtreeFilterRootIdChange(e.target.value)}
                >
                  <option value="">Select root component</option>
                  {components.map((component) => (
                    <option key={component.id} value={component.id}>
                      {component.name}
                    </option>
                  ))}
                </select>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      {creatingDeck ? (
        <form onSubmit={handleCreateDeck} className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded-md space-y-2">
          <div>
            <label className="text-xs text-amber-700 block mb-0.5">Deck name</label>
            <input
              autoFocus
              className="w-full text-sm border border-amber-300 rounded px-2 py-1 outline-none focus:border-amber-500 bg-white"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              placeholder="Checkout Tabs"
            />
          </div>
          <div>
            <label className="text-xs text-amber-700 block mb-0.5">Members</label>
            <select
              className="w-full text-sm border border-amber-300 rounded px-2 py-1 outline-none focus:border-amber-500 bg-white"
              value={deckType}
              onChange={(e) => setDeckType(e.target.value)}
            >
              <option value="component">Components</option>
              <option value="page">Pages</option>
            </select>
          </div>
          <p className="text-[10px] text-amber-700">
            Creating a deck also creates a shared wrapper component so all members stay siblings under one parent.
          </p>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded px-2 py-1 font-medium"
            >
              Create Deck
            </button>
            <button
              type="button"
              onClick={() => {
                setCreatingDeck(false);
                setDeckName('');
                setDeckType('component');
              }}
              className="flex-1 text-xs bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded px-2 py-1"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {filteredRoots.length === 0 ? (
        <p className="text-xs text-gray-400 italic text-center py-3">No matching components.</p>
      ) : (
        <ul>
          {filteredRoots.map((root) => (
            <TreeNode
              key={root.id}
              node={root}
              depth={0}
              editingId={editingId}
              setEditingId={setEditingId}
              collapsed={collapsed}
              toggleCollapse={toggleCollapse}
              deleteComponent={deleteComponent}
              rootId={rootId}
              selectedComponentId={selectedComponentId}
              onSelectComponent={onSelectComponent}
              wrapperDeckById={wrapperDeckById}
              onAddChild={handleAddChild}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
