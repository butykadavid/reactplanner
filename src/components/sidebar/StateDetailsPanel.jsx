import { useMemo } from 'react';
import usePlannerStore from '../../store/usePlannerStore';
import { classifyState, SCOPE, SCOPE_COLORS, SCOPE_LABELS } from '../../utils/scopeAnalyzer';

export default function StateDetailsPanel({ stateId, onClose }) {
    const { states, components, settings, updateState } = usePlannerStore();

    const stateItem = useMemo(
        () => states.find((st) => st.id === stateId) ?? null,
        [states, stateId],
    );

    const details = useMemo(() => {
        if (!stateItem) return null;

        const classification = classifyState(stateItem, components, settings);
        const scopeLabel = SCOPE_LABELS[classification.scope].text ?? classification.scope;
        const colors = SCOPE_COLORS[classification.scope];
        const recommendedColors = SCOPE_COLORS[classification.recommendedScope] ?? colors;
        const lcaComponent = components.find((comp) => comp.id === classification.lcaId) ?? null;
        const consumers = components.filter((comp) => stateItem.assignedTo.includes(comp.id));

        return {
            classification,
            scopeLabel,
            colors,
            recommendedColors,
            lcaComponent,
            consumers,
        };
    }, [stateItem, components, settings]);

    const canEditScopeOverride = settings.enableStateScopeOverride ?? false;
    // const canOverrideForState = details?.classification?.recommendedScope !== SCOPE.LOCAL;
    const canOverrideForState = true; // Allow override for all states for now, even local ones

    function handleScopeOverrideChange(nextValue) {
        if (!stateItem) return;
        updateState(stateItem.id, { scopeOverride: nextValue || null });
    }

    if (!stateItem || !details) {
        return (
            <div className="h-full rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">State Details</p>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-sm leading-none text-gray-400 hover:text-gray-600"
                    >
                        x
                    </button>
                </div>
                <p className="text-xs text-gray-400">Select a state to inspect scope, consumers, and description.</p>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">State Details</p>
                    <h3 className="text-sm font-semibold text-gray-800">{stateItem.name}</h3>
                    <p className={`text-[10px] font-medium ${details.colors.text}`}>{details.scopeLabel}</p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="text-sm leading-none text-gray-400 hover:text-gray-600"
                    title="Close details"
                >
                    x
                </button>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2">
                <div className="rounded-md border border-gray-200 bg-white px-2 py-1.5">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400">Type</p>
                    <p className="text-xs font-medium text-gray-700">{stateItem.valueType}</p>
                </div>
                <div className="rounded-md border border-gray-200 bg-white px-2 py-1.5">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400">Consumers</p>
                    <p className="text-xs font-medium text-gray-700">{details.consumers.length}</p>
                </div>
            </div>

            <div className="space-y-3">
                <section>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Scope</p>
                    <div className="rounded-md border border-gray-200 bg-white px-2 py-1.5 space-y-1">
                        <p className="text-xs text-gray-700">
                            <span className="text-gray-400">Recommended:</span>{' '}
                            <span className={`font-medium ${details.recommendedColors.text}`}>
                                {SCOPE_LABELS[details.classification.recommendedScope]?.text ?? details.classification.recommendedScope}
                            </span>
                        </p>
                        <p className="text-xs text-gray-700">
                            <span className="text-gray-400">Effective:</span>{' '}
                            <span className={`font-medium ${details.colors.text}`}>
                                {details.scopeLabel}
                            </span>
                            {details.classification.isOverridden ? (
                                <span className="ml-1 text-[10px] text-blue-600">(manual)</span>
                            ) : null}
                        </p>
                        <p className="text-xs text-gray-700">
                            <span className="text-gray-400">LCA:</span>{' '}
                            {details.lcaComponent ? details.lcaComponent.name : 'None'}
                        </p>
                        {stateItem.assignedTo.length > 1 ? (
                            <p className="text-xs text-gray-700">
                                <span className="text-gray-400">Span:</span>{' '}
                                {details.classification.spanDepth}
                            </p>
                        ) : null}
                    </div>
                </section>

                <section>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Scope Override</p>
                    <select
                        className="w-full rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-blue-400 disabled:opacity-50"
                        disabled={!canEditScopeOverride || !canOverrideForState}
                        value={stateItem.scopeOverride ?? ''}
                        onChange={(e) => handleScopeOverrideChange(e.target.value)}
                    >
                        <option value="">
                            Use system recommendation
                        </option>
                        <option value={SCOPE.PROP_DRILL}>Prop Drill</option>
                        <option value={SCOPE.CONTEXT}>Context</option>
                        <option value={SCOPE.REDUX}>Redux</option>
                    </select>
                    {!canEditScopeOverride ? (
                        <p className="mt-1 text-[10px] text-gray-400">
                            Enable scope overrides in Settings to manually force shared-state scope.
                        </p>
                    ) : null}
                    {canEditScopeOverride && !canOverrideForState ? (
                        <p className="mt-1 text-[10px] text-gray-400">
                            Local scope is not overrideable.
                        </p>
                    ) : null}
                </section>

                <section>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Description</p>
                    <textarea
                        className="min-h-24 w-full rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-blue-400"
                        placeholder="Describe what this state represents, ownership, constraints, and usage notes..."
                        value={stateItem.description ?? ''}
                        onChange={(e) => updateState(stateItem.id, { description: e.target.value })}
                    />
                </section>

                <section>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Consumers</p>
                    {details.consumers.length === 0 ? (
                        <p className="rounded-md border border-dashed border-gray-200 bg-white px-2 py-2 text-xs text-gray-400">
                            No components are currently consuming this state.
                        </p>
                    ) : (
                        <ul className="space-y-1">
                            {details.consumers.map((comp) => (
                                <li
                                    key={comp.id}
                                    className="flex items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700"
                                >
                                    <span className="truncate">{comp.name}</span>
                                    <span className={`rounded px-1 text-[10px] ${comp.type === 'page' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                                        {comp.type}
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
