import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import usePlannerStore from '../../store/usePlannerStore';
import { classifyAllStates, SCOPE, SCOPE_COLORS, SCOPE_LABELS } from '../../utils/scopeAnalyzer';
import ComponentNode from './ComponentNode';
import ScopeOverlayNode from './ScopeOverlayNode';

const nodeTypes = {
  componentNode: ComponentNode,
  scopeOverlayNode: ScopeOverlayNode,
};

export default function PlannerCanvas({ onSelectComponent }) {
  const {
    components,
    tags,
    states,
    settings,
    updateComponent,
    setParent,
  } = usePlannerStore();

  // ── Derive scope classifications ───────────────────────────────────────────
  const classifications = useMemo(
    () => classifyAllStates(states, components, settings),
    [states, components, settings],
  );

  // ── Build label-only nodes for Redux-scoped shared state ─────────────────
  const canvasStateLabelNodes = useMemo(() => {
    const labels = [];
    const labelStacks = new Map();

    states.forEach((st) => {
      const cls = classifications[st.id];
      if (!cls || !cls.lcaId || cls.scope !== SCOPE.REDUX || st.assignedTo.length < 2) return;

      const lcaComp = components.find((c) => c.id === cls.lcaId);
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
  }, [states, components, classifications]);

  // ── Build badges map: componentId → array of badge info ──────────────────
  const badgesMap = useMemo(() => {
    const map = {};
    states.forEach((st) => {
      const cls = classifications[st.id];
      if (!cls || !cls.lcaId || cls.scope === SCOPE.REDUX) return;
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

  // ── Convert Zustand components → React Flow nodes ─────────────────────────
  const rfNodes = useMemo(() => {
    const tagById = Object.fromEntries(tags.map((tag) => [tag.id, tag]));

    const componentNodes = components.map((comp) => ({
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
        tags: (comp.tagIds ?? []).map((tagId) => tagById[tagId]).filter(Boolean),
        scopeBadges: badgesMap[comp.id] ?? [],
      },
      className: 'group',
    }));

    return [...canvasStateLabelNodes, ...componentNodes];
  }, [components, tags, canvasStateLabelNodes, badgesMap]);

  // ── Derive edges from parentId relationships ──────────────────────────────
  const rfEdges = useMemo(() =>
    components
      .filter((c) => c.parentId)
      .map((c) => ({
        id: `edge-${c.parentId}-${c.id}`,
        source: c.parentId,
        target: c.id,
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#94a3b8', strokeWidth: 2 },
        markerEnd: { type: 'arrowclosed', color: '#94a3b8', width: 16, height: 16 },
      })),
    [components]);

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
            return n.data?.type === 'page' ? '#818cf8' : '#d1d5db';
          }}
          maskColor="rgba(240,240,240,0.6)"
        />
      </ReactFlow>
    </div>
  );
}
