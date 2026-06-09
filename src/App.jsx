import { useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import Toolbar from './components/toolbar/Toolbar';
import Sidebar from './components/sidebar/Sidebar';
import PlannerCanvas from './components/canvas/PlannerCanvas';

export default function App() {
  const [selectedComponentId, setSelectedComponentId] = useState(null);

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
        <Toolbar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar selectedComponentId={selectedComponentId} onSelectComponent={setSelectedComponentId} />
          <main className="flex-1 overflow-hidden">
            <PlannerCanvas selectedComponentId={selectedComponentId} onSelectComponent={setSelectedComponentId} />
          </main>
        </div>
      </div>
    </ReactFlowProvider>
  );
}
