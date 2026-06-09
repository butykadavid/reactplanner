import { useState } from 'react';
import usePlannerStore from '../../store/usePlannerStore';

export default function SettingsModal({ onClose }) {
  const { settings, updateSettings } = usePlannerStore();
  const [enableContext, setEnableContext] = useState(settings.enableContext ?? true);
  const [enableRedux, setEnableRedux] = useState(settings.enableRedux ?? true);
  const [enableStateScopeOverride, setEnableStateScopeOverride] = useState(settings.enableStateScopeOverride ?? false);
  const [contextMinSpan, setContextMinSpan] = useState(settings.contextMinSpan ?? 4);
  const [reduxMinSpan, setReduxMinSpan] = useState(settings.reduxMinSpan ?? 8);

  function handleSave() {
    const ctxSpan = Math.max(1, parseInt(contextMinSpan, 10) || 1);
    let rdxSpan = Math.max(1, parseInt(reduxMinSpan, 10) || 1);

    if (enableContext && enableRedux) {
      rdxSpan = Math.max(ctxSpan + 1, rdxSpan);
    }

    updateSettings({
      enableContext,
      enableRedux,
      enableStateScopeOverride,
      contextMinSpan: ctxSpan,
      reduxMinSpan: rdxSpan,
    });
    onClose();
  }

  const contextPreview = Math.max(1, parseInt(contextMinSpan, 10) || 1);
  const reduxPreviewRaw = Math.max(1, parseInt(reduxMinSpan, 10) || 1);
  const reduxPreview = enableContext && enableRedux
    ? Math.max(contextPreview + 1, reduxPreviewRaw)
    : reduxPreviewRaw;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-xl w-[420px] max-w-[95vw] p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">Scope Recommendation Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>

        <p className="text-xs text-gray-500">
          These settings use <strong>relative span depth</strong> from the shared owner (LCA) to the deepest consumer.
          A span of 1 means parent-child sharing, span 10 means the state must travel 10 levels.
          Higher spans represent broader cross-cutting state usage.
        </p>

        <div className="space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enableStateScopeOverride}
              onChange={(e) => setEnableStateScopeOverride(e.target.checked)}
              className="rounded border-gray-300 text-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Enable state scope override</span>
          </label>

          <p className="text-[11px] text-gray-400 -mt-2">
            When enabled, users can manually override shared-state scope between Prop Drill, Context, and Redux.
          </p>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enableContext}
              onChange={(e) => setEnableContext(e.target.checked)}
              className="rounded border-gray-300 text-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Enable Context recommendation</span>
          </label>

          <div className={enableContext ? '' : 'opacity-50'}>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Context starts at span
              <span className="ml-1 text-xs font-normal text-gray-400">(span ≥ this → Context)</span>
            </label>
            <input
              type="number"
              min={1}
              disabled={!enableContext}
              value={contextMinSpan}
              onChange={(e) => setContextMinSpan(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none focus:border-blue-400"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enableRedux}
              onChange={(e) => setEnableRedux(e.target.checked)}
              className="rounded border-gray-300 text-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Enable Redux recommendation</span>
          </label>

          <div className={enableRedux ? '' : 'opacity-50'}>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Redux starts at span
              <span className="ml-1 text-xs font-normal text-gray-400">(span ≥ this → Redux)</span>
            </label>
            <input
              type="number"
              min={enableContext ? contextPreview + 1 : 1}
              disabled={!enableRedux}
              value={reduxMinSpan}
              onChange={(e) => setReduxMinSpan(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none focus:border-blue-400"
            />
            {enableContext && enableRedux && (
              <p className="mt-1 text-[11px] text-gray-400">
                Redux span is automatically clamped to be greater than Context span.
              </p>
            )}
          </div>
        </div>

        {/* Visual reference */}
        <div className="rounded-md bg-gray-50 border border-gray-200 p-3 text-xs text-gray-600 space-y-1">
          <p className="font-medium text-gray-700 mb-1">Current rules:</p>
          <p>• 0 or 1 consumer → <span className="text-green-700 font-medium">Local</span></p>
          <p>• span &lt; {enableContext ? contextPreview : (enableRedux ? reduxPreview : '∞')} → <span className="text-blue-700 font-medium">Prop Drill</span></p>
          {enableContext && (
            <p>
              • span ≥ {contextPreview}{enableRedux ? ` and &lt; ${reduxPreview}` : ''} → <span className="text-yellow-700 font-medium">Context</span>
            </p>
          )}
          {enableRedux && (
            <p>• span ≥ {reduxPreview} → <span className="text-purple-700 font-medium">Redux</span></p>
          )}
          {!enableContext && !enableRedux && (
            <p>• All shared states → <span className="text-blue-700 font-medium">Prop Drill</span></p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 text-sm rounded-md bg-blue-500 hover:bg-blue-600 text-white font-medium"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
