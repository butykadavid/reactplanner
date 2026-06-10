import { useRef, useState } from 'react';
import usePlannerStore from '../../store/usePlannerStore';
import { exportToJson, importFromJson } from '../../utils/importExport';
import SettingsModal from '../settings/SettingsModal';
import GenerateStructureModal from '../structure/GenerateStructureModal';

export default function Toolbar() {
  const { projectName, setProjectName, initProject, importProject, exportProject } = usePlannerStore();
  const [showSettings, setShowSettings] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [importError, setImportError] = useState(null);
  const fileInputRef = useRef(null);

  function handleNewProject() {
    if (window.confirm('Start a new project? Unsaved changes will be lost.')) {
      initProject();
    }
  }

  function handleExport() {
    exportToJson(exportProject(), projectName);
  }

  function handleImportClick() {
    setImportError(null);
    fileInputRef.current?.click();
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importFromJson(file, importProject);
    } catch (err) {
      setImportError(err.message);
    }
    e.target.value = '';
  }

  return (
    <>
      <header className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-gray-200 shadow-sm flex-shrink-0 z-10">
        {/* Logo / title */}
        <div className="flex items-center gap-2 mr-2">
          <div className="w-6 h-6 bg-blue-500 rounded-md flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
          </div>
          <span className="text-sm font-bold text-gray-700 hidden sm:block">ReactPlanner</span>
        </div>

        {/* Project name */}
        <input
          className="text-sm font-medium border border-gray-200 rounded-md px-2.5 py-1 outline-none focus:border-blue-400 text-gray-800 w-48 bg-gray-50"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="Project name"
          title="Project name"
        />

        <button onClick={() => setShowGenerate(true)} className="text-xs px-3 py-1.5 rounded-md border border-green-300 bg-green-50 hover:bg-green-100 text-green-600 font-medium flex items-center gap-1">
          Generate
        </button>

        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleNewProject}
            className="text-xs px-3 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 font-medium"
          >
            New
          </button>

          <button
            onClick={handleImportClick}
            className="text-xs px-3 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 font-medium flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M8 12l4 4m0 0l4-4m-4 4V4" />
            </svg>
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileChange}
          />

          <button
            onClick={handleExport}
            className="text-xs px-3 py-1.5 rounded-md border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M8 8l4-4m0 0l4 4m-4-4v12" />
            </svg>
            Export
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-200 hover:bg-gray-100 text-gray-500"
            title="Settings"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Import error toast */}
      {importError && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white text-sm px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <span>{importError}</span>
          <button onClick={() => setImportError(null)} className="font-bold text-white/80 hover:text-white">×</button>
        </div>
      )}

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showGenerate && (
        <GenerateStructureModal
          isOpen={showGenerate}
          onClose={() => setShowGenerate(false)}
          projectName={projectName}
        />
      )}
    </>
  );
}
