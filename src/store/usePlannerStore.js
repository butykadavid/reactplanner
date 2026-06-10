import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { getDescendants } from '../utils/treeHelpers';

const ROOT_ID = 'root-app';
const VALID_COMPONENT_TYPES = new Set(['component', 'page']);
const GROUP_COLOR_PALETTE = ['sky', 'emerald', 'amber', 'rose', 'violet', 'cyan', 'lime'];

function makeAppRoot() {
    return {
        id: ROOT_ID,
        type: 'component',
        name: 'App',
        description: '',
        parentId: null,
        position: { x: 200, y: 150 },
        size: { width: 220, height: 80 },
        deckId: null,
        groupIds: [],
    };
}

function buildByIdMap(items) {
    return Object.fromEntries(items.map((item) => [item.id, item]));
}

function normalizeComponent(input = {}) {
    const type = VALID_COMPONENT_TYPES.has(input.type) ? input.type : 'component';
    const groupIds = Array.isArray(input.groupIds)
        ? Array.from(new Set(input.groupIds.filter(Boolean)))
        : Array.isArray(input.tagIds)
            ? Array.from(new Set(input.tagIds.filter(Boolean)))
            : [];

    return {
        ...input,
        type,
        description: typeof input.description === 'string' ? input.description : '',
        deckId: input.deckId ?? null,
        groupIds,
    };
}

function normalizeState(input = {}) {
    const scopeOverride = [null, 'propDrill', 'context', 'redux'].includes(input.scopeOverride)
        ? input.scopeOverride
        : null;

    return {
        ...input,
        id: input.id ?? uuidv4(),
        name: input.name?.trim() || 'newState',
        valueType: input.valueType?.trim() || 'any',
        description: typeof input.description === 'string' ? input.description : '',
        assignedTo: Array.isArray(input.assignedTo) ? input.assignedTo.filter(Boolean) : [],
        scopeOverride,
    };
}

function normalizeGroup(input = {}) {
    const name = input.name?.trim() || 'New Group';
    const color = GROUP_COLOR_PALETTE.includes(input.color) ? input.color : 'sky';

    return {
        id: input.id ?? uuidv4(),
        name,
        color,
    };
}

function getGroupColor(existingGroups = []) {
    const usageCount = GROUP_COLOR_PALETTE.reduce((acc, color) => ({ ...acc, [color]: 0 }), {});
    existingGroups.forEach((group) => {
        if (usageCount[group.color] !== undefined) {
            usageCount[group.color] += 1;
        }
    });

    return GROUP_COLOR_PALETTE.reduce((best, current) =>
        usageCount[current] < usageCount[best] ? current : best,
        GROUP_COLOR_PALETTE[0]);
}

function getSubtreeIds(rootId, components) {
    return [rootId, ...getDescendants(rootId, components)];
}

function normalizeDeck(input = {}) {
    const memberType = VALID_COMPONENT_TYPES.has(input.memberType) ? input.memberType : 'component';

    return {
        id: input.id ?? uuidv4(),
        name: input.name?.trim() || 'New Deck',
        memberType,
        wrapperId: input.wrapperId ?? null,
    };
}

function getDefaultWrapperParentId(components, requestedParentId = ROOT_ID) {
    if (requestedParentId === null) return null;
    return components.some((component) => component.id === requestedParentId)
        ? requestedParentId
        : (components.some((component) => component.id === ROOT_ID) ? ROOT_ID : null);
}

function makeDeckWrapper({ deckId, deckName, parentId }) {
    return normalizeComponent({
        id: uuidv4(),
        type: 'component',
        name: `${deckName} Deck`,
        parentId,
        position: { x: 140, y: 180 },
        size: { width: 220, height: 80 },
        wrapperForDeckId: deckId,
    });
}

function isDirectChildOfWrapper(component, deck) {
    return component.parentId === deck.wrapperId;
}

function sanitizeDeckStructure(components, decks) {
    const normalizedComponents = components.map((component) => normalizeComponent(component));
    const componentById = buildByIdMap(normalizedComponents);

    const normalizedDecks = decks
        .map((deck) => normalizeDeck(deck))
        .filter((deck) => {
            const wrapper = componentById[deck.wrapperId];
            return wrapper && wrapper.wrapperForDeckId === deck.id;
        });

    const deckById = buildByIdMap(normalizedDecks);

    return {
        components: normalizedComponents.map((component) => {
            const deck = component.deckId ? deckById[component.deckId] : null;

            if (!deck) {
                return {
                    ...component,
                    deckId: null,
                };
            }

            if (component.id === deck.wrapperId) {
                return {
                    ...component,
                    deckId: null,
                };
            }

            if (component.type !== deck.memberType || !isDirectChildOfWrapper(component, deck)) {
                return {
                    ...component,
                    deckId: null,
                };
            }

            return component;
        }),
        decks: normalizedDecks,
    };
}

function getDeckById(decks, deckId) {
    return decks.find((deck) => deck.id === deckId) ?? null;
}

function applyComponentPatchWithDeckRules(components, decks, componentId, patch) {
    const current = components.find((component) => component.id === componentId);
    if (!current) {
        return { nextComponents: components, changed: false };
    }

    const nextType = patch.type ?? current.type;
    const requestedDeckId = Object.prototype.hasOwnProperty.call(patch, 'deckId')
        ? patch.deckId
        : current.deckId;

    let nextParentId = Object.prototype.hasOwnProperty.call(patch, 'parentId')
        ? patch.parentId
        : current.parentId;
    let nextDeckId = requestedDeckId ?? null;

    if (nextDeckId) {
        const deck = getDeckById(decks, nextDeckId);
        if (!deck || deck.memberType !== nextType || componentId === deck.wrapperId) {
            return { nextComponents: components, changed: false };
        }

        nextParentId = deck.wrapperId;
    }

    if (!nextDeckId && current.deckId) {
        nextDeckId = null;
    }

    const nextComponents = components.map((component) => {
        if (component.id !== componentId) return component;

        return normalizeComponent({
            ...component,
            ...patch,
            type: nextType,
            parentId: nextParentId,
            deckId: nextDeckId,
        });
    });

    return { nextComponents, changed: true };
}

function removeDeckFromState(components, decks, deckId) {
    const deck = getDeckById(decks, deckId);
    if (!deck) {
        return { components, decks, changed: false };
    }

    const wrapper = components.find((component) => component.id === deck.wrapperId);
    const wrapperParentId = wrapper?.parentId ?? null;

    const nextComponents = components
        .filter((component) => component.id !== deck.wrapperId)
        .map((component) => {
            if (component.deckId === deckId) {
                return normalizeComponent({
                    ...component,
                    deckId: null,
                    parentId: wrapperParentId,
                });
            }

            return component;
        });

    const nextDecks = decks.filter((candidate) => candidate.id !== deckId);

    return {
        components: nextComponents,
        decks: nextDecks,
        changed: true,
    };
}

const defaultSettings = {
    contextMinSpan: 2,
    reduxMinSpan: 4,
    enableContext: true,
    enableRedux: true,
    enableStateScopeOverride: false,
};

function toInt(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeScopeSettings(input = {}) {
    let contextMinSpan = toInt(input.contextMinSpan, defaultSettings.contextMinSpan);
    let reduxMinSpan = toInt(input.reduxMinSpan, defaultSettings.reduxMinSpan);

    const enableContext = input.enableContext ?? true;
    const enableRedux = input.enableRedux ?? true;
    const enableStateScopeOverride = input.enableStateScopeOverride
        ?? input.enableStateTypeOverride
        ?? defaultSettings.enableStateScopeOverride;

    contextMinSpan = Math.max(1, contextMinSpan);
    reduxMinSpan = Math.max(1, reduxMinSpan);

    if (enableContext && enableRedux) {
        reduxMinSpan = Math.max(contextMinSpan + 1, reduxMinSpan);
    }

    if (!enableContext && !enableRedux) {
        contextMinSpan = defaultSettings.contextMinSpan;
        reduxMinSpan = defaultSettings.reduxMinSpan;
    }

    return {
        contextMinSpan,
        reduxMinSpan,
        enableContext: Boolean(enableContext),
        enableRedux: Boolean(enableRedux),
        enableStateScopeOverride: Boolean(enableStateScopeOverride),
    };
}

const usePlannerStore = create((set, get) => ({
    projectName: 'My React App',
    components: [makeAppRoot()],
    decks: [],
    groups: [],
    states: [],
    settings: normalizeScopeSettings(),

    setProjectName: (name) => set({ projectName: name }),

    // ── Components ────────────────────────────────────────────────────────────
    addComponent: (partial) => {
        const { components, decks } = get();
        const comp = {
            id: uuidv4(),
            type: 'component',
            name: 'NewComponent',
            parentId: null,
            position: { x: 100, y: 100 },
            size: { width: 220, height: 80 },
            deckId: null,
            ...partial,
        };

        const normalizedComp = normalizeComponent(comp);
        const deck = normalizedComp.deckId ? getDeckById(decks, normalizedComp.deckId) : null;

        if (normalizedComp.deckId && (!deck || deck.memberType !== normalizedComp.type)) {
            return null;
        }

        const nextComp = deck
            ? normalizeComponent({
                ...normalizedComp,
                parentId: deck.wrapperId,
            })
            : normalizedComp;

        const sanitized = sanitizeDeckStructure([...components, nextComp], decks);
        set({ components: sanitized.components, decks: sanitized.decks });
        return comp.id;
    },

    updateComponent: (id, patch) =>
        set((s) => {
            const nextState = applyComponentPatchWithDeckRules(s.components, s.decks, id, patch);
            if (!nextState.changed) {
                return {};
            }

            const sanitized = sanitizeDeckStructure(nextState.nextComponents, s.decks);

            return {
                components: sanitized.components,
                decks: sanitized.decks,
            };
        }),

    deleteComponent: (id) => {
        const { components, decks, states } = get();

        const wrapperDeck = decks.find((deck) => deck.wrapperId === id);
        if (wrapperDeck) {
            const removed = removeDeckFromState(components, decks, wrapperDeck.id);
            if (!removed.changed) return;

            set({
                components: removed.components,
                decks: removed.decks,
                states,
            });
            return;
        }

        // Collect ids of node + all descendants
        const toDelete = new Set();
        const collect = (nodeId) => {
            toDelete.add(nodeId);
            components.filter((c) => c.parentId === nodeId).forEach((c) => collect(c.id));
        };
        collect(id);

        const sanitized = sanitizeDeckStructure(
            components.filter((c) => !toDelete.has(c.id)),
            decks,
        );

        set({
            components: sanitized.components,
            decks: sanitized.decks,
            states: states.map((s) => ({
                ...s,
                assignedTo: s.assignedTo.filter((cid) => !toDelete.has(cid)),
            })),
        });
    },

    setParent: (nodeId, newParentId) =>
        set((s) => {
            const nextState = applyComponentPatchWithDeckRules(s.components, s.decks, nodeId, { parentId: newParentId });
            if (!nextState.changed) {
                return {};
            }

            const sanitized = sanitizeDeckStructure(nextState.nextComponents, s.decks);
            return {
                components: sanitized.components,
                decks: sanitized.decks,
            };
        }),

    createDeck: ({ name, memberType = 'component', parentId = ROOT_ID }) => {
        const deckName = name?.trim();
        if (!deckName || !VALID_COMPONENT_TYPES.has(memberType)) {
            return null;
        }

        const { components, decks } = get();
        const deckId = uuidv4();
        const wrapperParentId = getDefaultWrapperParentId(components, parentId);
        const wrapper = makeDeckWrapper({
            deckId,
            deckName,
            parentId: wrapperParentId,
        });
        const deck = normalizeDeck({
            id: deckId,
            name: deckName,
            memberType,
            wrapperId: wrapper.id,
        });

        const sanitized = sanitizeDeckStructure([...components, wrapper], [...decks, deck]);
        set({
            components: sanitized.components,
            decks: sanitized.decks,
        });

        return {
            deckId,
            wrapperId: wrapper.id,
        };
    },

    updateDeck: (id, patch) =>
        set((s) => ({
            decks: s.decks.map((deck) => {
                if (deck.id !== id) return deck;
                return normalizeDeck({
                    ...deck,
                    ...patch,
                    id: deck.id,
                    wrapperId: deck.wrapperId,
                });
            }),
        })),

    deleteDeck: (id) =>
        set((s) => {
            const removed = removeDeckFromState(s.components, s.decks, id);
            if (!removed.changed) {
                return {};
            }

            return {
                components: removed.components,
                decks: removed.decks,
            };
        }),

    assignComponentToDeck: (componentId, deckId) =>
        set((s) => {
            const nextState = applyComponentPatchWithDeckRules(s.components, s.decks, componentId, { deckId });
            if (!nextState.changed) {
                return {};
            }

            const sanitized = sanitizeDeckStructure(nextState.nextComponents, s.decks);
            return {
                components: sanitized.components,
                decks: sanitized.decks,
            };
        }),

    removeComponentFromDeck: (componentId) =>
        set((s) => {
            const nextState = applyComponentPatchWithDeckRules(s.components, s.decks, componentId, { deckId: null });
            if (!nextState.changed) {
                return {};
            }

            const sanitized = sanitizeDeckStructure(nextState.nextComponents, s.decks);
            return {
                components: sanitized.components,
                decks: sanitized.decks,
            };
        }),

    // ── Groups ───────────────────────────────────────────────────────────────
    createGroup: (name) => {
        const trimmed = name?.trim();
        if (!trimmed) return null;

        const { groups } = get();
        const existing = groups.find((group) => group.name.toLowerCase() === trimmed.toLowerCase());
        if (existing) return existing.id;

        const group = normalizeGroup({
            name: trimmed,
            color: getGroupColor(groups),
        });

        set((s) => ({ groups: [...s.groups, group] }));
        return group.id;
    },

    deleteGroup: (groupId) =>
        set((s) => ({
            groups: s.groups.filter((group) => group.id !== groupId),
            components: s.components.map((component) => ({
                ...component,
                groupIds: (component.groupIds ?? []).filter((id) => id !== groupId),
            })),
        })),

    assignGroupToSubtree: (componentId, groupId) =>
        set((s) => {
            if (!componentId || !groupId) return {};
            const subtreeIds = new Set(getSubtreeIds(componentId, s.components));

            return {
                components: s.components.map((component) => {
                    if (!subtreeIds.has(component.id)) return component;
                    const nextGroupIds = Array.from(new Set([...(component.groupIds ?? []), groupId]));
                    return {
                        ...component,
                        groupIds: nextGroupIds,
                    };
                }),
            };
        }),

    removeGroupFromSubtree: (componentId, groupId) =>
        set((s) => {
            if (!componentId || !groupId) return {};
            const subtreeIds = new Set(getSubtreeIds(componentId, s.components));

            return {
                components: s.components.map((component) => {
                    if (!subtreeIds.has(component.id)) return component;
                    return {
                        ...component,
                        groupIds: (component.groupIds ?? []).filter((id) => id !== groupId),
                    };
                }),
            };
        }),

    // ── States ────────────────────────────────────────────────────────────────
    addState: (partial) => {
        const state = normalizeState({
            name: 'newState',
            valueType: 'any',
            description: '',
            assignedTo: [],
            ...partial,
        });
        set((s) => ({ states: [...s.states, state] }));
        return state.id;
    },

    updateState: (id, patch) =>
        set((s) => ({
            states: s.states.map((st) => (st.id === id ? normalizeState({ ...st, ...patch, id: st.id }) : st)),
        })),

    deleteState: (id) =>
        set((s) => ({ states: s.states.filter((st) => st.id !== id) })),

    // ── Settings ──────────────────────────────────────────────────────────────
    updateSettings: (patch) =>
        set((s) => ({ settings: normalizeScopeSettings({ ...s.settings, ...patch }) })),

    // ── Project lifecycle ─────────────────────────────────────────────────────
    initProject: (name = 'My React App') =>
        set({
            projectName: name,
            components: [makeAppRoot()],
            decks: [],
            groups: [],
            states: [],
            settings: normalizeScopeSettings(),
        }),

    importProject: (json) => {
        const { projectName, components, decks, groups, tags, states, settings } = json;
        const sanitized = sanitizeDeckStructure(components ?? [makeAppRoot()], decks ?? []);
        const sourceGroups = Array.isArray(groups)
            ? groups
            : (Array.isArray(tags) ? tags : []);
        const normalizedGroups = sourceGroups
            .map((group) => normalizeGroup(group));
        const validGroupIds = new Set(normalizedGroups.map((group) => group.id));
        set({
            projectName: projectName ?? 'Imported Project',
            components: sanitized.components.map((component) => {
                const normalized = normalizeComponent(component);
                return {
                    ...normalized,
                    groupIds: (normalized.groupIds ?? []).filter((groupId) => validGroupIds.has(groupId)),
                };
            }),
            decks: sanitized.decks,
            groups: normalizedGroups,
            states: Array.isArray(states) ? states.map((state) => normalizeState(state)) : [],
            settings: normalizeScopeSettings(settings ?? {}),
        });
    },

    exportProject: () => {
        const { projectName, components, decks, groups, states, settings } = get();
        return { projectName, components, decks, groups, states, settings };
    },

    // Backwards compatibility aliases
    createTag: (name) => get().createGroup(name),
    deleteTag: (tagId) => get().deleteGroup(tagId),
    assignTagToSubtree: (componentId, tagId) => get().assignGroupToSubtree(componentId, tagId),
    removeTagFromSubtree: (componentId, tagId) => get().removeGroupFromSubtree(componentId, tagId),
}));

export default usePlannerStore;