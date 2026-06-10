import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    serverTimestamp,
    setDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';

function logFirestoreError(prefix, err) {
    if (!err) {
        console.error(prefix);
        return;
    }

    const code = err.code ?? 'unknown';
    const message = err.message ?? 'Unknown Firestore error';
    console.error(`${prefix} (${code}): ${message}`);

    if (code === 'failed-precondition') {
        console.warn('Offline mode is active; writes will be synced automatically when reconnected.');
    }

    if (code === 'unauthenticated') {
        console.warn('Authentication expired. Please sign in again.');
    }
}

export async function saveProjectToFirestore({ projectId, userId, projectName, data }) {
    if (!projectId || !userId) return;

    try {
        const projectRef = doc(db, 'projects', projectId);
        await setDoc(
            projectRef,
            {
                userId,
                projectName: projectName ?? 'Untitled Project',
                data,
                updatedAt: serverTimestamp(),
            },
            { merge: true },
        );
    } catch (err) {
        logFirestoreError('Failed to save project to Firestore', err);
        throw err;
    }
}

export async function createProjectDocument({ userId, projectName, data }) {
    if (!userId) {
        throw new Error('Cannot create project without an authenticated user.');
    }

    try {
        const projectsRef = collection(db, 'projects');
        const projectRef = await addDoc(projectsRef, {
            userId,
            projectName: projectName?.trim() || 'Untitled Project',
            data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return projectRef.id;
    } catch (err) {
        logFirestoreError('Failed to create project in Firestore', err);
        throw err;
    }
}

export async function deleteProjectDocument(projectId) {
    if (!projectId) return;

    try {
        await deleteDoc(doc(db, 'projects', projectId));
    } catch (err) {
        logFirestoreError('Failed to delete project from Firestore', err);
        throw err;
    }
}

export function withFirestoreSave(action, options) {
    const {
        getAuthContext,
        getProjectSnapshot,
        onSaveError,
    } = options;

    return (...args) => {
        const result = action(...args);

        Promise.resolve(result)
            .then(() => {
                const authContext = getAuthContext();
                if (!authContext?.userId || !authContext?.activeProjectId) return;

                const snapshot = getProjectSnapshot();
                return saveProjectToFirestore({
                    projectId: authContext.activeProjectId,
                    userId: authContext.userId,
                    projectName: authContext.projectName,
                    data: snapshot,
                });
            })
            .catch((err) => {
                if (typeof onSaveError === 'function') {
                    onSaveError(err);
                }
            });

        return result;
    };
}
