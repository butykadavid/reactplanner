import { useState } from 'react';
import usePlannerStore from '../../store/usePlannerStore';
import ComponentList from './ComponentList';
import ComponentDetailsPanel from './ComponentDetailsPanel';
import StateList from './StateList';
import StateDetailsPanel from './StateDetailsPanel';

const TABS = [
  { id: 'components', label: 'Components' },
  { id: 'states', label: 'States' },
];

export default function Sidebar({
  selectedComponentId,
  onSelectComponent,
  visibleComponentIds,
  showFilters,
  onShowFiltersChange,
  applyGroupFilter,
  onApplyGroupFilterChange,
  groupFilterId,
  onGroupFilterIdChange,
  applyStateFilter,
  onApplyStateFilterChange,
  stateFilterId,
  onStateFilterIdChange,
  applySubtreeFilter,
  onApplySubtreeFilterChange,
  subtreeFilterRootId,
  onSubtreeFilterRootIdChange,
}) {
  const [activeTab, setActiveTab] = useState('components');
  const [selectedStateId, setSelectedStateId] = useState(null);
  const states = usePlannerStore((s) => s.states);
  const hasSelectedComponent = selectedComponentId
    ? visibleComponentIds.has(selectedComponentId)
    : false;
  const hasSelectedState = selectedStateId
    ? states.some((stateItem) => stateItem.id === selectedStateId)
    : false;
  const visibleSelectedComponentId = hasSelectedComponent ? selectedComponentId : null;
  const visibleSelectedStateId = hasSelectedState ? selectedStateId : null;

  const showComponentDetailsPane = activeTab === 'components' && visibleSelectedComponentId !== null;
  const showStateDetailsPane = activeTab === 'states' && visibleSelectedStateId !== null;
  const sidebarWidthClass = (showComponentDetailsPane || showStateDetailsPane) ? 'w-[34rem]' : 'w-72';

  function handleTabChange(tabId) {
    setActiveTab(tabId);
    if (tabId !== 'components') {
      onSelectComponent(null);
    }
    if (tabId !== 'states') {
      setSelectedStateId(null);
    }
  }

  return (
    <aside className={`${sidebarWidthClass} flex-shrink-0 h-full flex flex-col bg-white border-r border-gray-200 overflow-hidden transition-[width] duration-200`}>
      {/* Tab headers */}
      <div className="flex border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors
              ${activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-500 bg-white'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'components' ? (
          <div className="h-full flex">
            <div className={`overflow-y-auto p-3 ${showComponentDetailsPane ? 'w-72 border-r border-gray-100' : 'w-full'}`}>
              <ComponentList
                selectedComponentId={visibleSelectedComponentId}
                onSelectComponent={onSelectComponent}
                visibleComponentIds={visibleComponentIds}
                showFilters={showFilters}
                onShowFiltersChange={onShowFiltersChange}
                applyGroupFilter={applyGroupFilter}
                onApplyGroupFilterChange={onApplyGroupFilterChange}
                groupFilterId={groupFilterId}
                onGroupFilterIdChange={onGroupFilterIdChange}
                applyStateFilter={applyStateFilter}
                onApplyStateFilterChange={onApplyStateFilterChange}
                stateFilterId={stateFilterId}
                onStateFilterIdChange={onStateFilterIdChange}
                applySubtreeFilter={applySubtreeFilter}
                onApplySubtreeFilterChange={onApplySubtreeFilterChange}
                subtreeFilterRootId={subtreeFilterRootId}
                onSubtreeFilterRootIdChange={onSubtreeFilterRootIdChange}
              />
            </div>

            {showComponentDetailsPane && (
              <div className="flex-1 overflow-y-auto p-3 bg-gray-50/60">
                <ComponentDetailsPanel
                  componentId={visibleSelectedComponentId}
                  onClose={() => onSelectComponent(null)}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex">
            <div className={`overflow-y-auto p-3 ${showStateDetailsPane ? 'w-72 border-r border-gray-100' : 'w-full'}`}>
              <StateList selectedStateId={visibleSelectedStateId} onSelectState={setSelectedStateId} />
            </div>

            {showStateDetailsPane && (
              <div className="flex-1 overflow-y-auto p-3 bg-gray-50/60">
                <StateDetailsPanel
                  stateId={visibleSelectedStateId}
                  onClose={() => setSelectedStateId(null)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="border-t border-gray-100 p-3">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Scope Legend</p>
        <div className="grid grid-cols-2 gap-1">
          {[
            { label: 'Local', color: 'bg-green-100 text-green-700 border-green-300' },
            { label: 'Prop Drill', color: 'bg-blue-100 text-blue-700 border-blue-300' },
            { label: 'Context', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
            { label: 'Redux', color: 'bg-purple-100 text-purple-700 border-purple-300' },
          ].map((item) => (
            <span key={item.label} className={`text-[10px] px-1.5 py-0.5 rounded border text-center font-medium ${item.color}`}>
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}
