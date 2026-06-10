import { useEffect, useMemo, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import Toolbar from './components/toolbar/Toolbar';
import Sidebar from './components/sidebar/Sidebar';
import PlannerCanvas from './components/canvas/PlannerCanvas';
import usePlannerStore from './store/usePlannerStore';
import { getFilteredComponentIds } from './utils/componentFilters';

export default function App() {
  const [selectedComponentId, setSelectedComponentId] = useState(null);
  const [showFilters, setShowFilters] = useState(true);
  const [applyGroupFilter, setApplyGroupFilter] = useState(false);
  const [groupFilterId, setGroupFilterId] = useState('');
  const [applyStateFilter, setApplyStateFilter] = useState(false);
  const [stateFilterId, setStateFilterId] = useState('');
  const [applySubtreeFilter, setApplySubtreeFilter] = useState(false);
  const [subtreeFilterRootId, setSubtreeFilterRootId] = useState('');

  const components = usePlannerStore((s) => s.components);
  const states = usePlannerStore((s) => s.states);
  const settings = usePlannerStore((s) => s.settings);

  useEffect(() => {
    if (applySubtreeFilter && selectedComponentId) {
      setSubtreeFilterRootId(selectedComponentId);
    }
  }, [applySubtreeFilter, selectedComponentId]);

  const visibleComponentIds = useMemo(
    () => getFilteredComponentIds({
      components,
      states,
      settings,
      applyGroupFilter,
      groupId: groupFilterId,
      applyStateFilter,
      stateId: stateFilterId,
      applySubtreeFilter,
      subtreeRootId: subtreeFilterRootId,
    }),
    [
      components,
      states,
      settings,
      applyGroupFilter,
      groupFilterId,
      applyStateFilter,
      stateFilterId,
      applySubtreeFilter,
      subtreeFilterRootId,
    ],
  );

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
        <Toolbar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            selectedComponentId={selectedComponentId}
            onSelectComponent={setSelectedComponentId}
            visibleComponentIds={visibleComponentIds}
            showFilters={showFilters}
            onShowFiltersChange={setShowFilters}
            applyGroupFilter={applyGroupFilter}
            onApplyGroupFilterChange={setApplyGroupFilter}
            groupFilterId={groupFilterId}
            onGroupFilterIdChange={setGroupFilterId}
            applyStateFilter={applyStateFilter}
            onApplyStateFilterChange={setApplyStateFilter}
            stateFilterId={stateFilterId}
            onStateFilterIdChange={setStateFilterId}
            applySubtreeFilter={applySubtreeFilter}
            onApplySubtreeFilterChange={setApplySubtreeFilter}
            subtreeFilterRootId={subtreeFilterRootId}
            onSubtreeFilterRootIdChange={setSubtreeFilterRootId}
          />
          <main className="flex-1 overflow-hidden">
            <PlannerCanvas
              onSelectComponent={setSelectedComponentId}
              visibleComponentIds={visibleComponentIds}
            />
          </main>
        </div>
      </div>
    </ReactFlowProvider>
  );
}
