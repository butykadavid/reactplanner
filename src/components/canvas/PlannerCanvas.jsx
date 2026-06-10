import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import usePlannerStore from '../../store/usePlannerStore';
import { classifyAllStates, SCOPE, SCOPE_COLORS, SCOPE_LABELS } from '../../utils/scopeAnalyzer';
import ComponentNode from './ComponentNode';
import ScopeOverlayNode from './ScopeOverlayNode';

function ContextEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  label,
  data,
}) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      {label ? (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan"
            title={data?.contextTooltip}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              fontSize: 10,
              fontWeight: 500,
              color: '#facc15',
              background: '#fef9c3',
              border: '1px solid #facc15',
              borderRadius: 8,
              padding: '3px 6px',
              pointerEvents: 'all',
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

const nodeTypes = {
  componentNode: ComponentNode,
  scopeOverlayNode: ScopeOverlayNode,
};

const edgeTypes = {
  contextEdge: ContextEdge,
};

export default function PlannerCanvas({ onSelectComponent, visibleComponentIds }) {
  const {
    components: allComponents,
    groups,
    states,
    settings,
    updateComponent,
    setParent,
  } = usePlannerStore();

  const visibleComponents = useMemo(
    () => allComponents.filter((component) => visibleComponentIds.has(component.id)),
    [allComponents, visibleComponentIds],
  );

  // ── Derive scope classifications ───────────────────────────────────────────
  const classifications = useMemo(
    () => classifyAllStates(states, allComponents, settings),
    [states, allComponents, settings],
  );

  // ── Build label-only nodes for Redux-scoped shared state ─────────────────
  const canvasStateLabelNodes = useMemo(() => {
    const labels = [];
    const labelStacks = new Map();

    states.forEach((st) => {
      const cls = classifications[st.id];
      if (!cls || !cls.lcaId || cls.scope !== SCOPE.REDUX || st.assignedTo.length < 2) return;

      const lcaComp = visibleComponents.find((c) => c.id === cls.lcaId);
      if (!lcaComp) return;

      const stackIndex = labelStacks.get(cls.lcaId) ?? 0;
      labelStacks.set(cls.lcaId, stackIndex + 1);

      const width = lcaComp.size?.width ?? 220;
      const colorClass = SCOPE_COLORS[cls.scope].text;
      const borderColorClass = SCOPE_COLORS[cls.scope].border;
      const bgColorClass = SCOPE_COLORS[cls.scope].bg;

      labels.push({
        id: `scope-overlay-${st.id}`,
        type: 'scopeOverlayNode',
        position: {
          x: lcaComp.position.x + width / 2,
          y: lcaComp.position.y - 42 - stackIndex * 28,
        },
        data: {
          colorClass,
          borderColorClass,
          bgColorClass,
          label: st.name,
          scopeLabel: SCOPE_LABELS[cls.scope]?.text ?? cls.scope,
        },
        selectable: false,
        draggable: false,
        deletable: false,
      });
    });

    return labels;
  }, [states, visibleComponents, classifications]);

  // ── Build badges map: componentId → array of badge info ──────────────────
  const badgesMap = useMemo(() => {
    const map = {};
    states.forEach((st) => {
      const cls = classifications[st.id];
      if (!cls || !cls.lcaId || cls.scope === SCOPE.REDUX || cls.scope === SCOPE.CONTEXT) return;
      const color = SCOPE_COLORS[cls.scope].hex;
      const scopeColors = SCOPE_COLORS[cls.scope];
      if (!map[cls.lcaId]) map[cls.lcaId] = [];
      map[cls.lcaId].push({
        stateId: st.id,
        stateName: st.name,
        scopeLabel: SCOPE_LABELS[cls.scope]?.text ?? cls.scope,
        colorClass: `${scopeColors.bg} ${scopeColors.text}`,
        color,
      });
    });
    return map;
  }, [states, classifications]);

  // ── Build context markers map: edgeId → array of state badge info ───────
  const contextEdgeBadges = useMemo(() => {
    const map = {};
    const componentById = Object.fromEntries(allComponents.map((c) => [c.id, c]));

    function getFirstHopFromAncestor(ancestorId, descendantId) {
      if (!ancestorId || !descendantId || ancestorId === descendantId) return null;
      let current = componentById[descendantId];
      if (!current) return null;

      while (current.parentId && current.parentId !== ancestorId) {
        current = componentById[current.parentId];
        if (!current) return null;
      }

      return current.parentId === ancestorId ? current.id : null;
    }

    states.forEach((st) => {
      const cls = classifications[st.id];
      if (!cls || !cls.lcaId || cls.scope !== SCOPE.CONTEXT) return;

      const uniqueConsumers = Array.from(new Set(st.assignedTo ?? []));
      const targetEdgeIds = new Set();

      uniqueConsumers.forEach((consumerId) => {
        const firstHopId = getFirstHopFromAncestor(cls.lcaId, consumerId);
        if (!firstHopId) return;
        targetEdgeIds.add(`edge-${cls.lcaId}-${firstHopId}`);
      });

      targetEdgeIds.forEach((edgeId) => {
        if (!map[edgeId]) map[edgeId] = [];
        map[edgeId].push({
          stateId: st.id,
          stateName: st.name,
          shortLabel: SCOPE_LABELS[SCOPE.CONTEXT].short,
        });
      });
    });

    return map;
  }, [allComponents, states, classifications]);

  // ── Convert Zustand components → React Flow nodes ─────────────────────────
  const rfNodes = useMemo(() => {
    const groupById = Object.fromEntries(groups.map((group) => [group.id, group]));

    const componentNodes = visibleComponents.map((comp) => ({
      id: comp.id,
      type: 'componentNode',
      position: comp.position,
      style: {
        width: comp.size?.width ?? 220,
        height: comp.size?.height ?? 80,
      },
      data: {
        label: comp.name,
        type: comp.type,
        isRoot: comp.parentId === null,
        isDeckComponent: Boolean(comp.wrapperForDeckId),
        groups: (comp.groupIds ?? []).map((groupId) => groupById[groupId]).filter(Boolean),
        scopeBadges: badgesMap[comp.id] ?? [],
      },
      className: 'group',
    }));

    return [...canvasStateLabelNodes, ...componentNodes];
  }, [visibleComponents, groups, canvasStateLabelNodes, badgesMap]);

  // ── Derive edges from parentId relationships ──────────────────────────────
  const rfEdges = useMemo(() =>
    visibleComponents
      .filter((c) => c.parentId && visibleComponentIds.has(c.parentId))
      .map((c) => {
        const edgeId = `edge-${c.parentId}-${c.id}`;
        const contextBadges = contextEdgeBadges[edgeId] ?? [];
        const contextLabel = contextBadges.length > 0
          ? (contextBadges.length > 1
            ? `${contextBadges[0].stateName} +${contextBadges.length - 1}`
            : contextBadges[0].stateName)
          : null;

        return {
          id: edgeId,
          source: c.parentId,
          target: c.id,
          type: 'contextEdge',
          animated: false,
          style: { stroke: '#94a3b8', strokeWidth: 1 },
          markerEnd: { type: 'arrowclosed', color: '#94a3b8', width: 16, height: 16 },
          label: contextLabel ?? undefined,
          data: {
            contextTooltip: contextBadges.map((badge) => badge.stateName).join('\n'),
          },
        };
      }),
    [visibleComponents, visibleComponentIds, contextEdgeBadges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(rfNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(rfEdges);

  // Keep nodes and edges in sync when store changes
  useMemo(() => {
    setNodes(rfNodes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfNodes]);

  useMemo(() => {
    setEdges(rfEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfEdges]);

  // ── Sync node position back to store on drag end ─────────────────────────
  const onNodeDragStop = useCallback(
    (_event, draggedNode) => {
      if (draggedNode.id.startsWith('scope-overlay')) return;
      const { x, y } = draggedNode.position;
      updateComponent(draggedNode.id, { position: { x, y } });
    },
    [updateComponent],
  );

  // ── Handle node click to sync sidebar selection ──────────────────────────
  const onNodeClick = useCallback(
    (_event, node) => {
      if (node.type === 'scopeOverlayNode') return;
      onSelectComponent(node.id);
    },
    [onSelectComponent],
  );

  // ── Handle connection creation for parent-child relationships ────────────
  const onConnect = useCallback(
    (connection) => {
      const { source, target } = connection;
      if (source === target) return;
      setParent(target, source);
    },
    [setParent],
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={3}
        deleteKeyCode={null}
        proOptions={{ hideAttribution: false }}
      >
        <Background color="#e5e7eb" gap={20} />
        <Controls />
        <MiniMap
          nodeColor={(n) => {
            if (n.type === 'scopeOverlayNode') return 'transparent';
            if (n.data?.type === 'page') return '#818cf8';
            if (n.data?.isDeckComponent) return '#facc15';
            return '#d1d5db';
          }}
          maskColor="rgba(240,240,240,0.6)"
        />
      </ReactFlow>
    </div>
  );
}
