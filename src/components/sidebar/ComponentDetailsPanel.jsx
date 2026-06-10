import { useMemo, useState } from 'react';
import usePlannerStore from '../../store/usePlannerStore';
import { classifyAllStates, SCOPE, SCOPE_COLORS, SCOPE_LABELS } from '../../utils/scopeAnalyzer';
import { getAncestors, getDepth, getDescendants } from '../../utils/treeHelpers';

const GROUP_COLOR_CLASSES = {
  sky: 'bg-sky-100 text-sky-700 border-sky-200',
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  rose: 'bg-rose-100 text-rose-700 border-rose-200',
  violet: 'bg-violet-100 text-violet-700 border-violet-200',
  cyan: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  lime: 'bg-lime-100 text-lime-700 border-lime-200',
};

function StateChip({ state, classification }) {
  const colors = SCOPE_COLORS[classification.scope];
  const scopeLabel = SCOPE_LABELS[classification.scope]?.text ?? classification.scope;

  return (
    <div className="rounded-md border border-gray-200 bg-white px-2 py-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-gray-800 truncate">{state.name}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${colors.bg} ${colors.text} ${colors.border}`}>
          {scopeLabel}
        </span>
      </div>
      <p className="text-[10px] text-gray-400 truncate">
        {state.valueType}
        {classification.spanDepth > 0 ? ` · Span ${classification.spanDepth}` : ''}
      </p>
    </div>
  );
}

export default function ComponentDetailsPanel({ componentId, onClose }) {
  const {
    components,
    decks,
    groups,
    states,
    settings,
    createGroup,
    assignGroupToSubtree,
    removeGroupFromSubtree,
    updateComponent,
    removeComponentFromDeck,
    deleteDeck,
  } = usePlannerStore();
  const [groupDraft, setGroupDraft] = useState('');

  const component = useMemo(
    () => components.find((c) => c.id === componentId) ?? null,
    [components, componentId],
  );

  const byId = useMemo(
    () => Object.fromEntries(components.map((comp) => [comp.id, comp])),
    [components],
  );

  const classifications = useMemo(
    () => classifyAllStates(states, components, settings),
    [states, components, settings],
  );

  const details = useMemo(() => {
    if (!component) return null;

    const depth = getDepth(component.id, components);
    const parent = component.parentId ? byId[component.parentId] ?? null : null;
    const deck = component.deckId ? decks.find((entry) => entry.id === component.deckId) ?? null : null;
    const wrapperDeck = component.wrapperForDeckId
      ? decks.find((entry) => entry.id === component.wrapperForDeckId) ?? null
      : null;
    const ancestorIds = getAncestors(component.id, components);

    const deckWrapper = deck ? byId[deck.wrapperId] ?? null : null;
    const deckMembers = deck
      ? components.filter((candidate) => candidate.deckId === deck.id)
      : [];
    const wrappedMembers = wrapperDeck
      ? components.filter((candidate) => candidate.deckId === wrapperDeck.id)
      : [];

    const directChildren = components.filter((c) => c.parentId === component.id);
    const descendantIds = getDescendants(component.id, components);

    const ancestrySet = new Set([...ancestorIds, component.id]);

    const assignedStates = states.filter((st) => st.assignedTo.includes(component.id));
    const assignedGroupIds = component.groupIds ?? [];
    const assignedGroups = assignedGroupIds
      .map((groupId) => groups.find((group) => group.id === groupId) ?? null)
      .filter(Boolean);

    const availableStates = states.filter((st) => {
      const cls = classifications[st.id];
      if (!cls) return false;
      if (st.assignedTo.includes(component.id)) return true;

      if (cls.scope === SCOPE.REDUX) return true;

      if (cls.scope === SCOPE.LOCAL) {
        return cls.lcaId === component.id;
      }

      return cls.lcaId ? ancestrySet.has(cls.lcaId) : false;
    });

    const assignableStates = availableStates.filter((st) => !assignedStates.some((as) => as.id === st.id));

    return {
      depth,
      parent,
      deck,
      deckWrapper,
      deckMembers,
      wrapperDeck,
      wrappedMembers,
      directChildren,
      descendantsCount: descendantIds.length,
      assignedStates,
      availableStates,
      assignableStates,
      assignedGroups,
      assignedGroupIds,
    };
  }, [component, components, byId, decks, states, classifications, groups]);

  function handleCreateAndApplyGroup() {
    if (!component) return;
    const newGroupId = createGroup(groupDraft);
    if (!newGroupId) return;
    assignGroupToSubtree(component.id, newGroupId);
    setGroupDraft('');
  }

  function handleToggleGroup(groupId) {
    if (!component) return;
    if (details?.assignedGroupIds?.includes(groupId)) {
      removeGroupFromSubtree(component.id, groupId);
      return;
    }
    assignGroupToSubtree(component.id, groupId);
  }

  if (!component || !details) {
    return (
      <div className="h-full rounded-lg border border-gray-200 bg-gray-50 p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Component Details</p>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-sm leading-none"
          >
            ×
          </button>
        </div>
        <p className="text-xs text-gray-400">Select a component in the tree to inspect its structure and state usage.</p>
      </div>
    );
  }

  return (
    <div className="h-full rounded-lg border border-gray-200 bg-gray-50 p-3 overflow-y-auto">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Component Details</p>
          <h3 className="text-sm font-semibold text-gray-800">{component.name}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-sm leading-none"
          title="Close details"
        >
          ×
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-md border border-gray-200 bg-white px-2 py-1.5">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Type</p>
          <p className="text-xs font-medium text-gray-700 capitalize">{component.type}</p>
        </div>
        <div className="rounded-md border border-gray-200 bg-white px-2 py-1.5">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Depth</p>
          <p className="text-xs font-medium text-gray-700">{details.depth}</p>
        </div>
        <div className="rounded-md border border-gray-200 bg-white px-2 py-1.5">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Direct Children</p>
          <p className="text-xs font-medium text-gray-700">{details.directChildren.length}</p>
        </div>
        <div className="rounded-md border border-gray-200 bg-white px-2 py-1.5">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Descendants</p>
          <p className="text-xs font-medium text-gray-700">{details.descendantsCount}</p>
        </div>
      </div>

      <div className="space-y-3">
        <section>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Description</p>
          <textarea
            className="min-h-24 w-full rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-blue-400"
            placeholder="Describe responsibilities, constraints, and implementation notes..."
            value={component.description ?? ''}
            onChange={(e) => updateComponent(component.id, { description: e.target.value })}
          />
        </section>

        <section>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Groups</p>
          <p className="text-[10px] text-gray-400 mb-1">
            Assigning this component to a group applies the group to its full subtree.
          </p>
          <div className="rounded-md border border-gray-200 bg-white px-2 py-2 space-y-2">
            <div className="flex gap-1 w-full">
              <input
                value={groupDraft}
                onChange={(e) => setGroupDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateAndApplyGroup();
                  }
                }}
                className="w-3/4 flex-1 text-xs border border-gray-300 rounded px-2 py-1 outline-none focus:border-blue-400"
                placeholder="Create or reuse group"
              />
              <button
                type="button"
                onClick={handleCreateAndApplyGroup}
                className="w-1/4 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded px-2 py-1"
              >
                Add
              </button>
            </div>

            {groups.length === 0 ? (
              <p className="text-xs text-gray-400">No groups yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {groups.map((group) => {
                  const isAssigned = details.assignedGroupIds.includes(group.id);
                  const colorClass = GROUP_COLOR_CLASSES[group.color] ?? GROUP_COLOR_CLASSES.sky;

                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => handleToggleGroup(group.id)}
                      className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${colorClass} ${isAssigned ? '' : 'opacity-50 hover:opacity-100'}`}
                      title={isAssigned ? 'Remove from subtree' : 'Apply to subtree'}
                    >
                      {group.name}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="text-[10px] text-gray-500">
              Applied on this component: {details.assignedGroups.length}
            </div>
          </div>
        </section>

        <section>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Hierarchy</p>
          <div className="rounded-md border border-gray-200 bg-white px-2 py-1.5 space-y-1">
            <p className="text-xs text-gray-700">
              <span className="text-gray-400">Parent:</span>{' '}
              {details.parent ? details.parent.name : 'None (root)'}
            </p>
          </div>
        </section>

        {details.deck ? (
          <section>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Deck</p>
            <div className="rounded-md border border-sky-200 bg-sky-50 px-2 py-1.5 space-y-1">
              <p className="text-xs text-sky-900">
                <span className="text-sky-700">Deck:</span>{' '}
                {details.deck.name}
              </p>
              <p className="text-xs text-sky-900">
                <span className="text-sky-700">Wrapper:</span>{' '}
                {details.deckWrapper ? details.deckWrapper.name : 'Missing wrapper'}
              </p>
              <p className="text-xs text-sky-900">
                <span className="text-sky-700">Members:</span>{' '}
                {details.deckMembers.length}
              </p>
              <ul className="space-y-1">
                {details.deckMembers.map((member) => (
                  <li key={member.id} className="text-xs text-sky-900 flex items-center justify-between gap-2">
                    <span className="truncate">{member.name}</span>
                    <span className={`text-[10px] px-1 rounded flex-shrink-0 ${member.type === 'page' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                      {member.type}
                    </span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => removeComponentFromDeck(component.id)}
                className="text-xs bg-white hover:bg-sky-100 text-sky-700 border border-sky-200 rounded px-2 py-1"
              >
                Remove From Deck
              </button>
            </div>
          </section>
        ) : null}

        {details.wrapperDeck ? (
          <section>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Wrapped Deck</p>
            <div className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 space-y-1">
              <p className="text-xs text-amber-900">
                <span className="text-amber-700">Deck:</span>{' '}
                {details.wrapperDeck.name}
              </p>
              <p className="text-xs text-amber-900">
                <span className="text-amber-700">Member type:</span>{' '}
                {details.wrapperDeck.memberType}
              </p>
              <p className="text-xs text-amber-900">
                <span className="text-amber-700">Members:</span>{' '}
                {details.wrappedMembers.length}
              </p>
              <ul className="space-y-1">
                {details.wrappedMembers.map((member) => (
                  <li key={member.id} className="text-xs text-amber-900 flex items-center justify-between gap-2">
                    <span className="truncate">{member.name}</span>
                    <span className={`text-[10px] px-1 rounded flex-shrink-0 ${member.type === 'page' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                      {member.type}
                    </span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => deleteDeck(details.wrapperDeck.id)}
                className="text-xs bg-white hover:bg-amber-100 text-amber-700 border border-amber-200 rounded px-2 py-1"
              >
                Delete Deck
              </button>
            </div>
          </section>
        ) : null}

        <section>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Currently Consuming</p>
          {details.assignedStates.length === 0 ? (
            <p className="text-xs text-gray-400 rounded-md border border-dashed border-gray-200 bg-white px-2 py-2">
              No states explicitly assigned to this component.
            </p>
          ) : (
            <div className="space-y-1">
              {details.assignedStates.map((st) => (
                <StateChip key={st.id} state={st} classification={classifications[st.id]} />
              ))}
            </div>
          )}
        </section>

        <section>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Can Consume In Scope</p>
          <div className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 mb-1">
            {details.assignableStates.length} available state{details.assignableStates.length === 1 ? '' : 's'}
          </div>
          {details.assignableStates.length === 0 ? (
            <p className="text-xs text-gray-400 rounded-md border border-dashed border-gray-200 bg-white px-2 py-2">
              No additional in-scope states beyond current assignments.
            </p>
          ) : (
            <div className="space-y-1">
              {details.assignableStates.map((st) => (
                <StateChip key={st.id} state={st} classification={classifications[st.id]} />
              ))}
            </div>
          )}
        </section>

        <section>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Direct Children</p>
          {details.directChildren.length === 0 ? (
            <p className="text-xs text-gray-400 rounded-md border border-dashed border-gray-200 bg-white px-2 py-2">
              This component has no direct children.
            </p>
          ) : (
            <ul className="space-y-1">
              {details.directChildren.map((child) => (
                <li key={child.id} className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 flex items-center justify-between gap-2">
                  <span className="truncate">{child.name}</span>
                  <span className={`text-[10px] px-1 rounded flex-shrink-0 ${child.type === 'page' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                    {child.type}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
