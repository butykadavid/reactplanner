import { useMemo, useState } from 'react';
import usePlannerStore from '../../store/usePlannerStore';
import { classifyState, SCOPE_COLORS, SCOPE_LABELS } from '../../utils/scopeAnalyzer';
import StateForm from './StateForm';

export default function StateList({ selectedStateId, onSelectState }) {
  const { states, components, settings, addState, deleteState } = usePlannerStore();
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');

  const filteredStates = useMemo(() => {
    const trimmed = search.trim().toLowerCase();
    if (!trimmed) return states;

    return states.filter((st) =>
      st.name.toLowerCase().includes(trimmed) ||
      st.valueType.toLowerCase().includes(trimmed),
    );
  }, [states, search]);

  function handleAdd() {
    const id = addState({ name: 'newState', valueType: 'object', description: '', assignedTo: [] });
    setEditingId(id);
    onSelectState(id);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">States</span>
        <button
          onClick={handleAdd}
          className="text-xs bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-600 border border-gray-200 rounded px-2 py-0.5"
        >
          + State
        </button>
      </div>

      <div className="mb-2">
        <input
          className="w-full text-xs border border-gray-300 rounded px-2 py-1 outline-none focus:border-blue-400"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search states..."
        />
      </div>

      {states.length === 0 && (
        <p className="text-xs text-gray-400 italic text-center py-4">No states yet. Add one!</p>
      )}

      {states.length > 0 && filteredStates.length === 0 && (
        <p className="text-xs text-gray-400 italic text-center py-3">No matching states.</p>
      )}

      <ul className="space-y-1">
        {filteredStates.map((st) => {
          const cls = classifyState(st, components, settings);
          const colors = SCOPE_COLORS[cls.scope];
          const scopeLabel = SCOPE_LABELS[cls.scope]?.short ?? cls.scope;
          const lcaComp = components.find((c) => c.id === cls.lcaId);

          return (
            <li key={st.id}>
              <div
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer group
                  hover:bg-gray-100 ${selectedStateId === st.id || editingId === st.id ? 'bg-gray-100' : ''}`}
                onClick={() => onSelectState(st.id)}
              >
                {/* Scope badge */}
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border flex-shrink-0
                  ${colors.bg} ${colors.text} ${colors.border}`}>
                  {scopeLabel}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate font-medium">{st.name}</p>
                  <p className="text-[10px] text-gray-400 truncate">
                    {st.valueType}
                    {lcaComp ? ` · LCA: ${lcaComp.name}` : ''}
                    {st.assignedTo.length > 1 ? ` · Span: ${cls.spanDepth}` : ''}
                    {cls.isOverridden ? ' · Manual scope' : ''}
                    {st.assignedTo.length > 0 ? ` · ${st.assignedTo.length} component${st.assignedTo.length > 1 ? 's' : ''}` : ''}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(editingId === st.id ? null : st.id);
                    onSelectState(st.id);
                  }}
                  className="text-gray-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold flex-shrink-0"
                  title="Edit"
                >
                  ✎
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteState(st.id);
                    if (editingId === st.id) setEditingId(null);
                    if (selectedStateId === st.id) onSelectState(null);
                  }}
                  className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold flex-shrink-0"
                  title="Delete state"
                >
                  ×
                </button>
              </div>

              {editingId === st.id && (
                <StateForm stateItem={st} onClose={() => setEditingId(null)} />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
