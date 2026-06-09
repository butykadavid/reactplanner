/**
 * Trigger a JSON file download with the current project data.
 * @param {object} data - result of store.exportProject()
 * @param {string} projectName
 */
export function exportToJson(data, projectName = 'project') {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${projectName.replace(/\s+/g, '_')}.reactplanner.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Read a File object, parse JSON, validate minimal shape, then call importProject.
 * @param {File} file
 * @param {function} importProject - store action
 * @returns {Promise<void>}
 */
export function importFromJson(file, importProject) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        if (!json.components || !Array.isArray(json.components)) {
          throw new Error('Invalid file: missing "components" array.');
        }
        importProject(json);
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}
