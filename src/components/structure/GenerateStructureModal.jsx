import { useState } from 'react';
import usePlannerStore from '../../store/usePlannerStore';
import { generateFolderStructure, structureToJSON, structureToText } from '../../utils/generateProjectStructure';

export default function GenerateStructureModal({ isOpen, onClose, projectName }) {
    const { components, decks } = usePlannerStore();
    const [outputMode, setOutputMode] = useState('json'); // 'json' or 'text'
    const [includeStyles, setIncludeStyles] = useState(true);
    const [includeIndexFiles, setIncludeIndexFiles] = useState(true);
    const [namingConvention, setNamingConvention] = useState('as-is'); // 'as-is' or 'kebab-case'
    const [isGenerating, setIsGenerating] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    if (!isOpen) return null;

    const handleGenerate = async () => {
        setIsGenerating(true);
        setSuccessMessage('');

        try {
            const structure = generateFolderStructure(components, decks, {
                includeStyles,
                includeIndexFiles,
                namingConvention,
            });

            if (outputMode === 'json') {
                const jsonStr = structureToJSON(structure, projectName);
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${projectName.replace(/\s+/g, '_')}_structure.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                setSuccessMessage('✓ Structure exported as JSON');
            } else if (outputMode === 'text') {
                const textStr = structureToText(structure);
                const blob = new Blob([textStr], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${projectName.replace(/\s+/g, '_')}_structure.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                setSuccessMessage('✓ Structure exported as text');
            }

            setTimeout(() => {
                setSuccessMessage('');
                onClose();
            }, 1500);
        } catch (err) {
            setSuccessMessage(`✗ Error: ${err.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40 bg-black/30"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
                <div className="bg-white rounded-lg shadow-xl w-96 pointer-events-auto p-6 space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-800">Generate Project Structure</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                        >
                            ×
                        </button>
                    </div>

                    {/* Output Mode */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 block mb-2">Output Format</label>
                        <div className="flex gap-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="outputMode"
                                    value="json"
                                    checked={outputMode === 'json'}
                                    onChange={(e) => setOutputMode(e.target.value)}
                                    className="w-4 h-4"
                                />
                                <span className="text-sm text-gray-700">JSON (Structure)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="outputMode"
                                    value="text"
                                    checked={outputMode === 'text'}
                                    onChange={(e) => setOutputMode(e.target.value)}
                                    className="w-4 h-4"
                                />
                                <span className="text-sm text-gray-700">Text (Tree View)</span>
                            </label>
                        </div>
                    </div>

                    {/* Options */}
                    <div className="space-y-3 border-t pt-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={includeStyles}
                                onChange={(e) => setIncludeStyles(e.target.checked)}
                                className="w-4 h-4"
                            />
                            <span className="text-sm text-gray-700">Include CSS files</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={includeIndexFiles}
                                onChange={(e) => setIncludeIndexFiles(e.target.checked)}
                                className="w-4 h-4"
                            />
                            <span className="text-sm text-gray-700">Include index.js files</span>
                        </label>

                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-1">File Naming</label>
                            <select
                                value={namingConvention}
                                onChange={(e) => setNamingConvention(e.target.value)}
                                className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 outline-none focus:border-blue-400"
                            >
                                <option value="as-is">As-is (e.g., UserAuth)</option>
                                <option value="kebab-case">Kebab-case (e.g., user-auth)</option>
                            </select>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="text-[11px] text-gray-500 bg-gray-50 p-2 rounded border border-gray-200">
                        <p>
                            Generates a layer-based folder structure:
                        </p>
                        <ul className="mt-1 ml-2 space-y-0.5">
                            <li>• Pages in <code>src/pages/</code></li>
                            <li>• Components in <code>src/components/</code></li>
                            <li>• Decks create wrapper folders with members inside</li>
                            <li>• Templates included for JSX files</li>
                        </ul>
                    </div>

                    {/* Status Message */}
                    {successMessage && (
                        <div
                            className={`text-sm p-2 rounded text-center font-medium ${successMessage.startsWith('✓')
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                                }`}
                        >
                            {successMessage}
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-medium px-3 py-2 rounded text-sm transition"
                        >
                            {isGenerating ? 'Generating...' : 'Generate'}
                        </button>
                        <button
                            onClick={onClose}
                            disabled={isGenerating}
                            className="flex-1 bg-white hover:bg-gray-50 disabled:bg-gray-100 text-gray-700 border border-gray-300 font-medium px-3 py-2 rounded text-sm transition"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
