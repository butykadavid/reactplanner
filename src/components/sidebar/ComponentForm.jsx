import { useMemo, useState } from 'react';
import usePlannerStore from '../../store/usePlannerStore';
import { getDescendants } from '../../utils/treeHelpers';

export default function ComponentForm({ comp, onClose }) {
  const { components, decks, updateComponent } = usePlannerStore();
  const [name, setName] = useState(comp.name);
  const [type, setType] = useState(comp.type);
  const [parentId, setParentId] = useState(comp.parentId ?? '');
  const [deckId, setDeckId] = useState(comp.deckId ?? '');
  const isRoot = comp.id === 'root-app';
  const isDeckWrapper = Boolean(comp.wrapperForDeckId);

  // Exclude self and all descendants to prevent cycles
  const descendants = new Set(getDescendants(comp.id, components));
  const parentOptions = components.filter(
    (c) => c.id !== comp.id && !descendants.has(c.id),
  );
  const compatibleDecks = useMemo(
    () => decks.filter((deck) => deck.memberType === type),
    [decks, type],
  );
  const selectedDeck = useMemo(
    () => compatibleDecks.find((deck) => deck.id === deckId) ?? null,
    [compatibleDecks, deckId],
  );
  const effectiveSelectedDeck = selectedDeck && selectedDeck.wrapperId !== comp.id ? selectedDeck : null;
  const selectedDeckWrapper = useMemo(
    () => components.find((component) => component.id === effectiveSelectedDeck?.wrapperId) ?? null,
    [components, effectiveSelectedDeck],
  );

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) {
      updateComponent(comp.id, {
        name: trimmed,
        type,
        parentId: effectiveSelectedDeck ? effectiveSelectedDeck.wrapperId : (parentId === '' ? null : parentId),
        deckId: effectiveSelectedDeck?.id ?? null,
      });
    }
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="p-2 bg-gray-50 border border-gray-200 rounded-md space-y-2 mt-1">
      <div>
        <label className="text-xs text-gray-500 block mb-0.5">Name</label>
        <input
          autoFocus
          className="w-full text-sm border border-gray-300 rounded px-2 py-1 outline-none focus:border-blue-400"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 block mb-0.5">Type</label>
        <select
          className="w-full text-sm border border-gray-300 rounded px-2 py-1 outline-none focus:border-blue-400 bg-white"
          value={type}
          onChange={(e) => setType(e.target.value)}
          disabled={isDeckWrapper}
        >
          <option value="component">Component</option>
          <option value="page">Page</option>
        </select>
        {isDeckWrapper ? (
          <p className="text-[10px] text-gray-400 mt-0.5">Deck wrappers always remain components.</p>
        ) : null}
      </div>
      {!isRoot && !isDeckWrapper ? (
        <div>
          <label className="text-xs text-gray-500 block mb-0.5">Deck</label>
          <select
            className="w-full text-sm border border-gray-300 rounded px-2 py-1 outline-none focus:border-blue-400 bg-white"
            value={effectiveSelectedDeck?.id ?? ''}
            onChange={(e) => setDeckId(e.target.value)}
          >
            <option value="">— None —</option>
            {compatibleDecks.map((deck) => (
              <option key={deck.id} value={deck.id}>
                {deck.name} ({deck.memberType})
              </option>
            ))}
          </select>
          {selectedDeckWrapper ? (
            <p className="text-[10px] text-gray-400 mt-0.5">
              Members in this deck are kept as direct children of {selectedDeckWrapper.name}.
            </p>
          ) : null}
        </div>
      ) : null}
      <div>
        <label className="text-xs text-gray-500 block mb-0.5">Parent</label>
        {effectiveSelectedDeck ? (
          <div className="w-full text-sm border border-gray-200 rounded px-2 py-1 bg-gray-100 text-gray-700">
            {selectedDeckWrapper ? `${selectedDeckWrapper.name} (deck wrapper)` : 'Deck wrapper'}
          </div>
        ) : (
          <select
            className="w-full text-sm border border-gray-300 rounded px-2 py-1 outline-none focus:border-blue-400 bg-white"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
          >
            <option value="">— None (root) —</option>
            {parentOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.type})
              </option>
            ))}
          </select>
        )}
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
