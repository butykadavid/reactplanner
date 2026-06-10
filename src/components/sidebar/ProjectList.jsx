import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import usePlannerStore from '../../store/usePlannerStore';

export default function ProjectList({ onSelectProject }) {
    const userId = usePlannerStore((s) => s.userId);
    const activeProjectId = usePlannerStore((s) => s.activeProjectId);
    const setActiveProjectId = usePlannerStore((s) => s.setActiveProjectId);
    const createProject = usePlannerStore((s) => s.createProject);
    const deleteProject = usePlannerStore((s) => s.deleteProject);

    const [projects, setProjects] = useState([]);
    const [error, setError] = useState(null);
    const [projectName, setProjectName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (!userId) {
            return undefined;
        }

        const projectsQuery = query(
            collection(db, 'projects'),
            where('userId', '==', userId),
        );

        const unsubscribe = onSnapshot(
            projectsQuery,
            (snapshot) => {
                setError(null);
                const nextProjects = snapshot.docs
                    .map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }))
                    .sort((a, b) => {
                        const aMs = a.updatedAt?.toMillis?.() ?? 0;
                        const bMs = b.updatedAt?.toMillis?.() ?? 0;
                        return bMs - aMs;
                    });

                setProjects(nextProjects);

                if (nextProjects.length === 0 && activeProjectId) {
                    setActiveProjectId(null);
                    return;
                }

                if (nextProjects.length > 0 && !nextProjects.some((project) => project.id === activeProjectId)) {
                    const defaultProjectId = nextProjects[0].id;
                    setActiveProjectId(defaultProjectId);
                    onSelectProject?.(defaultProjectId);
                }
            },
            (listenerError) => {
                console.error('Failed to load projects:', listenerError);
                setError(listenerError.message ?? 'Unable to load projects.');
            },
        );

        return unsubscribe;
    }, [userId, activeProjectId, setActiveProjectId, onSelectProject]);

    const canCreate = useMemo(() => projectName.trim().length > 0 && !isCreating, [projectName, isCreating]);
    const visibleProjects = userId ? projects : [];
    const visibleError = userId ? error : null;

    async function handleCreateProject() {
        if (!canCreate) return;

        setIsCreating(true);
        setError(null);

        try {
            const createdProjectId = await createProject(projectName.trim());
            setProjectName('');
            onSelectProject?.(createdProjectId);
        } catch (createError) {
            console.error('Create project failed:', createError);
            setError(createError.message ?? 'Failed to create project.');
        } finally {
            setIsCreating(false);
        }
    }

    async function handleDeleteActiveProject() {
        if (!activeProjectId || isDeleting) return;

        const confirmed = window.confirm('Delete the selected project? This cannot be undone.');
        if (!confirmed) return;

        setIsDeleting(true);
        setError(null);

        try {
            await deleteProject(activeProjectId);
        } catch (deleteError) {
            console.error('Delete project failed:', deleteError);
            setError(deleteError.message ?? 'Failed to delete project.');
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <div className="h-full flex flex-col">
            <div className="p-3 border-b border-gray-100 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Projects</p>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleCreateProject();
                            }
                        }}
                        placeholder="New project name"
                        className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 outline-none focus:border-blue-400"
                        title="New project name"
                    />
                    <button
                        type="button"
                        onClick={handleCreateProject}
                        disabled={!canCreate}
                        className="px-3 py-1.5 text-xs rounded border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isCreating ? 'Creating...' : 'Create'}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {visibleProjects.length === 0 && (
                    <p className="text-sm text-gray-500">No projects yet. Create one to get started.</p>
                )}

                {visibleProjects.map((project) => {
                    const isActive = project.id === activeProjectId;
                    const updatedAtLabel = project.updatedAt?.toDate?.()
                        ? project.updatedAt.toDate().toLocaleString()
                        : 'No updates yet';

                    return (
                        <button
                            key={project.id}
                            type="button"
                            onClick={() => onSelectProject?.(project.id)}
                            className={`w-full text-left px-3 py-2 rounded border transition ${isActive
                                    ? 'border-blue-300 bg-blue-50'
                                    : 'border-gray-200 bg-white hover:bg-gray-50'
                                }`}
                            title={project.projectName || 'Untitled Project'}
                        >
                            <p className="text-sm font-medium text-gray-800 truncate">{project.projectName || 'Untitled Project'}</p>
                            <p className="text-[11px] text-gray-500 truncate">Updated: {updatedAtLabel}</p>
                        </button>
                    );
                })}

                {visibleError && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
                        {visibleError}
                    </p>
                )}
            </div>

            <div className="p-3 border-t border-gray-100">
                <button
                    type="button"
                    onClick={handleDeleteActiveProject}
                    disabled={!activeProjectId || isDeleting}
                    className="w-full px-3 py-2 text-xs rounded border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isDeleting ? 'Deleting...' : 'Delete Active Project'}
                </button>
            </div>
        </div>
    );
}