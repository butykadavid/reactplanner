import { getDescendants } from './treeHelpers';
import { classifyState } from './scopeAnalyzer';

function collectSubtreeIds(rootId, components) {
    if (!rootId) return new Set();
    const componentIds = new Set(components.map((component) => component.id));
    if (!componentIds.has(rootId)) return new Set();
    return new Set([rootId, ...getDescendants(rootId, components)]);
}

function expandSeedIdsToValidSubtrees(seedIds, components) {
    const seedSet = new Set(seedIds);
    if (seedSet.size === 0) return new Set();

    const roots = components
        .filter((component) => seedSet.has(component.id) && !seedSet.has(component.parentId))
        .map((component) => component.id);

    const visibleIds = new Set();
    roots.forEach((rootId) => {
        collectSubtreeIds(rootId, components).forEach((id) => visibleIds.add(id));
    });

    return visibleIds;
}

function collectAncestorChain(componentId, components) {
    const chain = new Set([componentId]);
    const componentById = Object.fromEntries(components.map((c) => [c.id, c]));
    let current = componentById[componentId];

    while (current && current.parentId) {
        chain.add(current.parentId);
        current = componentById[current.parentId];
    }

    return chain;
}

export function getFilteredComponentIds({
    components,
    states,
    settings,
    applyGroupFilter,
    groupId,
    applyStateFilter,
    stateId,
    applySubtreeFilter,
    subtreeRootId,
}) {
    const allIds = new Set(components.map((component) => component.id));

    const activeSets = [];

    if (applyGroupFilter && groupId) {
        const exactMatches = components
            .filter((component) => (component.groupIds ?? []).includes(groupId))
            .map((component) => component.id);

        const groupSet = new Set();
        exactMatches.forEach((matchId) => {
            collectAncestorChain(matchId, components).forEach((id) => groupSet.add(id));
        });
        activeSets.push(groupSet);
    }

    if (applyStateFilter && stateId) {
        const state = states.find((item) => item.id === stateId);
        if (state) {
            const classification = classifyState(state, components, settings);
            if (classification.lcaId) {
                activeSets.push(collectSubtreeIds(classification.lcaId, components));
            }
        }
    }

    if (applySubtreeFilter && subtreeRootId) {
        activeSets.push(collectSubtreeIds(subtreeRootId, components));
    }

    if (activeSets.length === 0) {
        return allIds;
    }

    const intersection = new Set(activeSets[0]);
    for (let i = 1; i < activeSets.length; i += 1) {
        for (const id of intersection) {
            if (!activeSets[i].has(id)) {
                intersection.delete(id);
            }
        }
    }

    const withAncestors = new Set();
    intersection.forEach((id) => {
        collectAncestorChain(id, components).forEach((ancestorId) => withAncestors.add(ancestorId));
    });

    return withAncestors;
}
