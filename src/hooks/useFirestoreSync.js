import { useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import usePlannerStore from '../store/usePlannerStore';

export function useFirestoreSync() {
    const userId = usePlannerStore((state) => state.userId);
    const activeProjectId = usePlannerStore((state) => state.activeProjectId);
    const loadProjectSnapshot = usePlannerStore((state) => state.loadProjectSnapshot);
    const setSyncError = usePlannerStore((state) => state.setSyncError);
    const clearSyncError = usePlannerStore((state) => state.clearSyncError);

    useEffect(() => {
        if (!userId || !activeProjectId) {
            clearSyncError();
            return undefined;
        }

        const projectRef = doc(db, 'projects', activeProjectId);
        const unsubscribe = onSnapshot(
            projectRef,
            (snapshot) => {
                if (!snapshot.exists()) {
                    setSyncError('Active project was not found in Firestore.');
                    return;
                }

                const project = snapshot.data();
                if (project.userId && project.userId !== userId) {
                    setSyncError('You do not have access to this project.');
                    return;
                }

                clearSyncError();
                loadProjectSnapshot(project);
            },
            (error) => {
                const code = error?.code ?? 'unknown';
                const message = error?.message ?? 'Failed to synchronize with Firestore.';
                setSyncError(`${code}: ${message}`);
                console.error('Firestore listener error:', error);
            },
        );

        return unsubscribe;
    }, [userId, activeProjectId, loadProjectSnapshot, setSyncError, clearSyncError]);
}
