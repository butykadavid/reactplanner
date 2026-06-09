import { getLCA, getDepth } from './treeHelpers';

export const SCOPE = {
    LOCAL: 'local',
    PROP_DRILL: 'propDrill',
    CONTEXT: 'context',
    REDUX: 'redux',
};

const OVERRIDABLE_SCOPES = new Set([SCOPE.PROP_DRILL, SCOPE.CONTEXT, SCOPE.REDUX]);

export const SCOPE_LABELS = {
    [SCOPE.LOCAL]: { text: 'Local', short: 'L' },
    [SCOPE.PROP_DRILL]: { text: 'Prop Drill', short: 'P' },
    [SCOPE.CONTEXT]: { text: 'Context', short: 'C' },
    [SCOPE.REDUX]: { text: 'Redux', short: 'R' },
};

export const SCOPE_COLORS = {
    [SCOPE.LOCAL]: { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-700', hex: '#86efac' },
    [SCOPE.PROP_DRILL]: { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-700', hex: '#93c5fd' },
    [SCOPE.CONTEXT]: { bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-700', hex: '#fde047' },
    [SCOPE.REDUX]: { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-700', hex: '#c4b5fd' },
};

function toInt(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function getScopeRecommendationSettings(settings = {}) {
    const contextMinSpan = Math.max(1, toInt(settings.contextMinSpan, 4));
    let reduxMinSpan = Math.max(1, toInt(settings.reduxMinSpan, 8));
    const enableContext = settings.enableContext ?? true;
    const enableRedux = settings.enableRedux ?? true;
    const enableStateScopeOverride = settings.enableStateScopeOverride ?? false;

    if (enableContext && enableRedux) {
        reduxMinSpan = Math.max(contextMinSpan + 1, reduxMinSpan);
    }

    return {
        contextMinSpan,
        reduxMinSpan,
        enableContext: Boolean(enableContext),
        enableRedux: Boolean(enableRedux),
        enableStateScopeOverride: Boolean(enableStateScopeOverride),
    };
}

/**
 * Classify a state item and return its scope recommendation.
 *
 * @param {object} state - { id, name, assignedTo: string[] }
 * @param {object[]} components - flat array of all components
 * @param {object} settings
 * @returns {{ scope: string, recommendedScope: string, isOverridden: boolean, lcaId: string|null, lcaDepth: number, spanDepth: number }}
 */
export function classifyState(state, components, settings) {
    const { assignedTo } = state;
    const {
        contextMinSpan,
        reduxMinSpan,
        enableContext,
        enableRedux,
        enableStateScopeOverride,
    } = getScopeRecommendationSettings(settings);

    if (!assignedTo || assignedTo.length === 0) {
        return {
            scope: SCOPE.LOCAL,
            recommendedScope: SCOPE.LOCAL,
            isOverridden: false,
            lcaId: null,
            lcaDepth: 0,
            spanDepth: 0,
        };
    }

    if (assignedTo.length === 1) {
        const lcaId = assignedTo[0];
        return {
            scope: SCOPE.LOCAL,
            recommendedScope: SCOPE.LOCAL,
            isOverridden: false,
            lcaId,
            lcaDepth: getDepth(lcaId, components),
            spanDepth: 0,
        };
    }

    const lcaId = getLCA(assignedTo, components);
    if (!lcaId) {
        return {
            scope: SCOPE.LOCAL,
            recommendedScope: SCOPE.LOCAL,
            isOverridden: false,
            lcaId: null,
            lcaDepth: 0,
            spanDepth: 0,
        };
    }

    const lcaDepth = getDepth(lcaId, components);
    const validAssigned = assignedTo.filter((id) => components.some((c) => c.id === id));
    const maxConsumerDepth = validAssigned.reduce(
        (maxDepth, id) => Math.max(maxDepth, getDepth(id, components)),
        lcaDepth,
    );
    const spanDepth = Math.max(0, maxConsumerDepth - lcaDepth);

    let recommendedScope;
    if (enableRedux && spanDepth >= reduxMinSpan) {
        recommendedScope = SCOPE.REDUX;
    } else if (enableContext && spanDepth >= contextMinSpan) {
        recommendedScope = SCOPE.CONTEXT;
    } else {
        recommendedScope = SCOPE.PROP_DRILL;
    }

    const requestedOverride = state.scopeOverride ?? null;
    const canApplyOverride =
        enableStateScopeOverride
        && recommendedScope !== SCOPE.LOCAL
        && OVERRIDABLE_SCOPES.has(requestedOverride);

    const scope = canApplyOverride ? requestedOverride : recommendedScope;

    return {
        scope,
        recommendedScope,
        isOverridden: scope !== recommendedScope,
        lcaId,
        lcaDepth,
        spanDepth,
    };
}

/**
 * Classify all states and return a map: stateId → classification result.
 */
export function classifyAllStates(states, components, settings) {
    const result = {};
    states.forEach((st) => {
        result[st.id] = classifyState(st, components, settings);
    });
    return result;
}