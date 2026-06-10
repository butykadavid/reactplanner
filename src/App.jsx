import { useEffect, useMemo, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import Toolbar from './components/toolbar/Toolbar';
import Sidebar from './components/sidebar/Sidebar';
import PlannerCanvas from './components/canvas/PlannerCanvas';
import AuthGuard from './components/AuthGuard';
import OfflineIndicator from './components/OfflineIndicator';
import usePlannerStore from './store/usePlannerStore';
import { getFilteredComponentIds } from './utils/componentFilters';
import { useAuth } from './hooks/useAuth';
import { useFirestoreSync } from './hooks/useFirestoreSync';

export default function App() {
  const { user, loading, loginWithGoogle, logout, error } = useAuth();
  const setUserId = usePlannerStore((s) => s.setUserId);
  const activeProjectId = usePlannerStore((s) => s.activeProjectId);
  const syncError = usePlannerStore((s) => s.syncError);

  useFirestoreSync();

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
    setUserId(user?.uid ?? null);
  }, [user, setUserId]);

  function handleSelectComponent(componentId) {
    setSelectedComponentId(componentId);
    if (applySubtreeFilter && componentId) {
      setSubtreeFilterRootId(componentId);
    }
  }

  function handleApplySubtreeFilterChange(enabled) {
    setApplySubtreeFilter(enabled);
    if (enabled && selectedComponentId) {
      setSubtreeFilterRootId(selectedComponentId);
    }
  }

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-600">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-md">
          <h1 className="text-3xl font-bold text-slate-900">ReactPlanner</h1>
          <p className="mt-3 text-sm text-slate-600">
            Sign in with your Google account to access your planner projects.
          </p>
          {error && (
            <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={loginWithGoogle}
            className="mt-6 w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <AuthGuard>
        <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
          <Toolbar />
          <OfflineIndicator />
          <div className="absolute right-4 top-4 z-20 flex items-center gap-3 rounded-md bg-white/90 px-3 py-1.5 shadow-sm">
            <span className="text-sm text-gray-600">{user.email}</span>
            <button
              type="button"
              onClick={logout}
              className="rounded bg-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-300"
            >
              Logout
            </button>
          </div>
          {syncError && (
            <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 shadow-sm">
              Sync issue: {syncError}
            </div>
          )}
          <div className="flex flex-1 overflow-hidden">
            <Sidebar
              selectedComponentId={selectedComponentId}
              onSelectComponent={handleSelectComponent}
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
              onApplySubtreeFilterChange={handleApplySubtreeFilterChange}
              subtreeFilterRootId={subtreeFilterRootId}
              onSubtreeFilterRootIdChange={setSubtreeFilterRootId}
            />
            <main className="flex-1 overflow-hidden">
              {activeProjectId ? (
                <PlannerCanvas
                  onSelectComponent={handleSelectComponent}
                  visibleComponentIds={visibleComponentIds}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 bg-white">
                  Select or create a project to begin.
                </div>
              )}
            </main>
          </div>
        </div>
      </AuthGuard>
    </ReactFlowProvider>
  );
}
