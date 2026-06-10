<!-- markdownlint-disable-file -->
# Implementation Details: Firebase Real-Time Integration for ReactPlanner

## Context Reference

Sources: Firebase Integration Research (.copilot-tracking/research/2026-06-10/firebase-integration-research.md), Firebase Official Documentation, current ReactPlanner architecture (Zustand + React 19)

## Implementation Phase 1: Firebase Setup and Configuration

<!-- parallelizable: false -->

### Step 1.1: Create Firebase project in Google Console

Visit https://console.firebase.google.com and create a new project named "ReactPlanner" or similar. This will generate a Firebase project with a unique Project ID. In the project settings:
1. Go to Project Settings → Service Accounts → Generate new private key (save for backend reference later)
2. Enable Google provider under Authentication → Sign-in method
3. Add authorized domain: `localhost:5173` for development

Files involved:
* None created yet; this is manual Firebase Console configuration

Success criteria:
* Firebase project exists with Project ID accessible in project settings
* Google Sign-In provider is enabled and visible in Auth sign-in methods
* OAuth redirect URIs include `localhost:5173`

Context references:
* Firebase Console: https://console.firebase.google.com

Dependencies:
* Google Cloud account with billing enabled (Firebase free tier includes 50K Firestore reads/day, sufficient for development)

### Step 1.2: Install Firebase SDK and add .env.local configuration

Install Firebase SDK via npm:
```bash
npm install firebase
```

Create `.env.local` in project root with Firebase config values from Firebase Console → Project Settings:
```
VITE_FIREBASE_API_KEY=AIzaSyDxxxxxxxxxx
VITE_FIREBASE_AUTH_DOMAIN=reactplanner-xxxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=reactplanner-xxxxx
VITE_FIREBASE_STORAGE_BUCKET=reactplanner-xxxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:xxxxxxxxxxxxxxxxxx
```

Files:
* package.json - Update dependencies to add `"firebase": "^11.0.0"`
* .env.local - New file with Firebase configuration (add to .gitignore if not already present)

Success criteria:
* npm install completes without errors
* All required Firebase config variables are present in .env.local
* .env.local is in .gitignore to prevent credential commits

Context references:
* Firebase Console Project Settings: https://console.firebase.google.com/project/_/settings/general

Dependencies:
* Step 1.1 completion (Firebase project created and Project ID available)

### Step 1.3: Create Firebase initialization module (src/config/firebase.js)

Create new file `src/config/firebase.js` that initializes Firebase and exports auth, db, and analytics instances:

```javascript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Firestore persistence failed: multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.warn('Firestore persistence not supported in this browser');
  }
});

export default app;
```

Files:
* src/config/firebase.js - New initialization module

Success criteria:
* File exports `auth`, `db`, and `app` objects
* No errors when importing in other modules
* Offline persistence is enabled (or safely skipped if unsupported)

Context references:
* Firebase Initialization: https://firebase.google.com/docs/web/setup#initialize

Dependencies:
* Step 1.2 completion (.env.local configured with Firebase credentials)

### Step 1.4: Deploy Firestore security rules

In Firebase Console → Firestore Database → Rules tab, set rules to:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read and write their own projects
    match /projects/{projectId} {
      allow read, write: if request.auth.uid == resource.data.userId;
      allow create: if request.auth.uid == request.resource.data.userId;
    }
    
    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Click Publish to deploy rules immediately.

Files:
* None created; Firestore Console only

Success criteria:
* Rules are published in Firestore Console without syntax errors
* Rules allow authenticated users to create projects with their userId
* Rules prevent users from reading/writing other users' projects

Context references:
* Firestore Security Rules: https://firebase.google.com/docs/firestore/security/overview
* Rules Planning Log: DR-01 (single-user rules; multi-user sharing rules will be different in v2)

Dependencies:
* Step 1.1 completion (Firebase project created with Firestore database)

### Step 1.5: Validate Firebase connection with test listener

In `src/App.jsx` (or temporary test file), add a useEffect to verify Firestore connection:

```javascript
import { useEffect } from 'react';
import { auth } from './config/firebase';
import { onAuthStateChanged } from 'firebase/auth';

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log('✓ Firebase Auth Connected:', user.email);
    } else {
      console.log('✓ Firebase Auth Ready (user not logged in)');
    }
  });
  return unsubscribe;
}, []);
```

Files:
* src/App.jsx - Add test listener (temporary, remove after validation)

Success criteria:
* Console shows "Firebase Auth Connected" or "Firebase Auth Ready" message
* No auth errors in browser console
* Firestore is accessible and ready for writes

Dependencies:
* Step 1.3 completion (firebase.js initialized)

---

## Implementation Phase 2: Google Authentication UI and Flow

<!-- parallelizable: false -->

### Step 2.1: Create authentication context/hook (src/hooks/useAuth.js)

Create new file `src/hooks/useAuth.js` that manages authentication state and provides login/logout functions:

```javascript
import { useEffect, useState } from 'react';
import { auth } from '../config/firebase';
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from 'firebase/auth';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Login with Google
  const loginWithGoogle = async () => {
    try {
      setError(null);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
      return result.user;
    } catch (err) {
      setError(err.message);
      console.error('Login failed:', err);
      throw err;
    }
  };

  // Logout
  const logout = async () => {
    try {
      setError(null);
      await signOut(auth);
      setUser(null);
    } catch (err) {
      setError(err.message);
      console.error('Logout failed:', err);
      throw err;
    }
  };

  return {
    user,
    loading,
    error,
    loginWithGoogle,
    logout,
    isAuthenticated: !!user,
  };
}
```

Files:
* src/hooks/useAuth.js - New authentication hook

Success criteria:
* Hook exports `useAuth` function
* `onAuthStateChanged` listener initializes auth state
* `loginWithGoogle` triggers popup sign-in
* `logout` clears auth state
* No TypeScript errors

Context references:
* Firebase Auth: https://firebase.google.com/docs/auth/web/google-signin
* React Hooks: https://react.dev/reference/react/useEffect

Dependencies:
* Step 1.3 completion (firebase.js with auth initialized)

### Step 2.2: Add Google Sign-In button and logout to App.jsx

Update `src/App.jsx` to display login/logout UI based on auth state:

```javascript
import { useAuth } from './hooks/useAuth';

export default function App() {
  const { user, loading, loginWithGoogle, logout } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <h1 className="text-3xl font-bold">ReactPlanner</h1>
        <button
          onClick={loginWithGoogle}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Existing canvas/sidebar structure */}
      <div className="absolute top-4 right-4">
        <span className="text-sm text-gray-600 mr-4">{user.email}</span>
        <button
          onClick={logout}
          className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded transition"
        >
          Logout
        </button>
      </div>
      {/* Rest of App */}
    </div>
  );
}
```

Files:
* src/App.jsx - Add auth UI and conditional rendering (modify existing component)

Success criteria:
* Unauthenticated users see Sign in with Google button
* Clicking button opens Google OAuth popup
* After successful login, user email displayed with Logout button
* Clicking Logout clears auth and returns to sign-in screen
* No console errors

Context references:
* Existing App.jsx component structure
* Tailwind button styling conventions from project

Dependencies:
* Step 2.1 completion (useAuth hook created)

### Step 2.3: Create AuthGuard wrapper component to redirect unauthenticated users

Create new file `src/components/AuthGuard.jsx` that wraps authenticated content:

```javascript
import { useAuth } from '../hooks/useAuth';

export default function AuthGuard({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return null; // Handled by App.jsx conditional render
  }

  return children;
}
```

Update `src/App.jsx` to use AuthGuard:

```javascript
<AuthGuard>
  {/* Existing canvas/sidebar content */}
</AuthGuard>
```

Files:
* src/components/AuthGuard.jsx - New guard component
* src/App.jsx - Wrap main content with AuthGuard

Success criteria:
* AuthGuard prevents unauthenticated access to main UI
* Guards handle loading state gracefully
* No TypeScript errors

Dependencies:
* Step 2.2 completion (App.jsx auth UI)

### Step 2.4: Test login/logout flow with Google account

Manual testing steps:
1. Run `npm run dev` and navigate to localhost:5173
2. Click "Sign in with Google" button
3. Complete Google OAuth popup (use real Google account or test account)
4. Verify user email displays in top-right corner
5. Click "Logout" button
6. Verify signed-out state returns to login screen
7. Refresh page; verify session persists (user still logged in)
8. Clear browser cookies and refresh; verify signed-out state

Files:
* None (testing only)

Success criteria:
* Login popup opens and completes without errors
* User email persists across page refresh
* Logout clears auth state
* No console errors related to auth flow

Dependencies:
* All Phase 2 steps completed

---

## Implementation Phase 3: Firestore Sync Layer (Real-Time Listeners and Writes)

<!-- parallelizable: false -->

### Step 3.1: Extend usePlannerStore with userId, activeProjectId, and project management actions

Update `src/store/usePlannerStore.js` to add:
1. `userId` - current authenticated user ID
2. `activeProjectId` - currently selected project
3. Actions: `setUserId`, `setActiveProjectId`, `createProject`, `deleteProject`

Key additions to store:

```javascript
const usePlannerStore = create((set, get) => ({
  // Existing state...
  
  // New auth/project state
  userId: null,
  activeProjectId: null,

  // Set authenticated user
  setUserId: (userId) => set({ userId }),

  // Set active project (clears and loads new project state)
  setActiveProjectId: (projectId) => set({ activeProjectId: projectId }),

  // Create new project
  createProject: async (projectName) => {
    // Placeholder; actual implementation in Phase 3.3
    // Returns projectId
  },

  // Delete project
  deleteProject: async (projectId) => {
    // Placeholder; actual implementation in Phase 3.3
    // Clears activeProjectId if deleting active project
  },

  // Get current project data as JSON (for Firestore serialization)
  getProjectSnapshot: () => {
    const { components, groups, states, decks, settings } = get();
    return { components, groups, states, decks, settings };
  },

  // Load project data from Firestore snapshot
  loadProjectSnapshot: (snapshot) => {
    if (!snapshot) return;
    const { components = [], groups = [], states = [], decks = [], settings = {} } = snapshot;
    set({
      components: components.map(normalizeComponent),
      groups: groups.map(normalizeGroup),
      states: states.map(normalizeState),
      decks,
      settings,
    });
  },
}));
```

Files:
* src/store/usePlannerStore.js - Extend with userId, activeProjectId, project actions, and snapshot methods

Success criteria:
* Store compiles without errors
* New state and actions are accessible via usePlannerStore hook
* `getProjectSnapshot()` returns serialized project data
* `loadProjectSnapshot()` populates store from serialized data

Context references:
* Existing usePlannerStore.js structure and normalization functions
* Zustand v5 API: https://zustand-demo.vercel.app/

Dependencies:
* None (store update only)

### Step 3.2: Create sync hook (src/hooks/useFirestoreSync.js) for real-time listeners

Create new file `src/hooks/useFirestoreSync.js` that establishes real-time listeners for the active project:

```javascript
import { useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import usePlannerStore from '../store/usePlannerStore';

export function useFirestoreSync() {
  const { userId, activeProjectId, loadProjectSnapshot } = usePlannerStore();

  useEffect(() => {
    if (!userId || !activeProjectId) return; // No listener if no user or project

    // Set up real-time listener for active project
    const projectRef = doc(db, 'projects', activeProjectId);
    const unsubscribe = onSnapshot(projectRef, (snapshot) => {
      if (snapshot.exists()) {
        const projectData = snapshot.data();
        // Only load data, not metadata
        loadProjectSnapshot(projectData.data);
      }
    });

    return unsubscribe; // Cleanup listener on unmount or when dependencies change
  }, [userId, activeProjectId, loadProjectSnapshot]);
}
```

Files:
* src/hooks/useFirestoreSync.js - New sync hook

Success criteria:
* Hook establishes onSnapshot listener when userId and activeProjectId are set
* Listener calls `loadProjectSnapshot()` when project data changes
* Listener unsubscribes on component unmount or dependency change
* No console errors

Context references:
* Firestore Real-Time Listeners: https://firebase.google.com/docs/firestore/query-data/listen
* Existing usePlannerStore structure

Dependencies:
* Step 3.1 completion (store extended with userId, activeProjectId, snapshot methods)

### Step 3.3: Integrate Firestore writes into store mutations (create wrapper for auto-save)

Create new file `src/utils/firestoreSync.js` that wraps store mutations to auto-save to Firestore:

```javascript
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import usePlannerStore from '../store/usePlannerStore';

// Helper to save project snapshot to Firestore
export async function saveProjectToFirestore(projectId, projectData) {
  try {
    const projectRef = doc(db, 'projects', projectId);
    await setDoc(
      projectRef,
      {
        data: projectData,
        updatedAt: serverTimestamp(),
      },
      { merge: true } // Preserve metadata fields like userId, projectName
    );
  } catch (err) {
    console.error('Failed to save project to Firestore:', err);
    // Could surface retry UI here in future
  }
}

// Wrapper function for auto-save on mutation
export function withFirestoreSave(action) {
  return async (...args) => {
    // Call the action
    action(...args);

    // Get updated snapshot
    const { userId, activeProjectId, getProjectSnapshot } = usePlannerStore.getState();
    if (userId && activeProjectId) {
      const snapshot = getProjectSnapshot();
      // Debounce writes in production; for now, save immediately
      await saveProjectToFirestore(activeProjectId, snapshot);
    }
  };
}
```

Update `src/store/usePlannerStore.js` to wrap mutation actions:

```javascript
// In the store definition, wrap existing mutations:
const baseActions = {
  createComponent: (input) => { /* existing logic */ },
  updateComponent: (id, updates) => { /* existing logic */ },
  deleteComponent: (id) => { /* existing logic */ },
  // ... other mutations
};

// Wrap each mutation with auto-save
Object.keys(baseActions).forEach((key) => {
  const original = baseActions[key];
  baseActions[key] = withFirestoreSave(original);
});
```

Files:
* src/utils/firestoreSync.js - New Firestore sync utilities
* src/store/usePlannerStore.js - Wrap mutations with auto-save (modify existing)

Success criteria:
* Auto-save wrapper logs successful saves to console (temporary for testing)
* Firestore shows updated `updatedAt` timestamp and data fields after mutation
* No console errors
* Mutations complete within ~1 second (includes Firestore write latency)

Context references:
* Firestore Writes: https://firebase.google.com/docs/firestore/manage-data/add-data
* Existing mutation patterns in usePlannerStore.js

Discrepancy references:
* DR-01: Debouncing not yet implemented (will add in Phase 5 if needed for performance)

Dependencies:
* Step 3.1 completion (store snapshot methods)
* Step 3.2 completion (listeners established)

### Step 3.4: Add error handling and offline support (Firestore persistence + retry UI)

Update `src/utils/firestoreSync.js` to add error handling and queue management:

```javascript
let saveQueue = [];
let isSaving = false;

export async function saveProjectToFirestore(projectId, projectData) {
  try {
    const projectRef = doc(db, 'projects', projectId);
    await setDoc(
      projectRef,
      {
        data: projectData,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    console.log('✓ Project saved to Firestore');
  } catch (err) {
    console.error('Failed to save project:', err.code, err.message);
    
    if (err.code === 'failed-precondition') {
      console.warn('Offline: changes will sync when reconnected');
    } else if (err.code === 'unauthenticated') {
      console.error('Authentication lost; please re-login');
    }
    // Firestore offline persistence handles queueing automatically
  }
}
```

Create `src/components/OfflineIndicator.jsx` for connection status:

```javascript
import { useEffect, useState } from 'react';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 px-4 py-2 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded">
      Offline — changes will sync when reconnected
    </div>
  );
}
```

Add `<OfflineIndicator />` to App.jsx root.

Files:
* src/utils/firestoreSync.js - Add error handling
* src/components/OfflineIndicator.jsx - New offline status indicator
* src/App.jsx - Include OfflineIndicator component

Success criteria:
* Console shows appropriate error messages for different failure modes
* Offline indicator displays when network is unavailable
* Firestore offline persistence queues writes automatically
* Changes sync when connection restored
* No unhandled promise rejections

Context references:
* Firestore Offline Persistence: https://firebase.google.com/docs/firestore/manage-data/enable-offline

Dependencies:
* Step 3.3 completion (saveProjectToFirestore function)

---

## Implementation Phase 4: Project Management UI and Store Integration

<!-- parallelizable: false -->

### Step 4.1: Add Projects tab component (src/components/sidebar/ProjectList.jsx)

Create new file `src/components/sidebar/ProjectList.jsx` displaying user's projects:

```javascript
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import usePlannerStore from '../../store/usePlannerStore';

export default function ProjectList({ onSelectProject }) {
  const { userId, activeProjectId } = usePlannerStore();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    const q = query(collection(db, 'projects'), where('userId', '==', userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProjects(projectList);
      setLoading(false);
    });

    return unsubscribe;
  }, [userId]);

  return (
    <div className="p-4 space-y-2">
      {loading ? (
        <p className="text-gray-500 text-sm">Loading projects...</p>
      ) : projects.length === 0 ? (
        <p className="text-gray-500 text-sm">No projects yet. Create one to get started!</p>
      ) : (
        projects.map((project) => (
          <div
            key={project.id}
            onClick={() => onSelectProject(project.id)}
            className={`p-2 rounded cursor-pointer transition ${
              activeProjectId === project.id
                ? 'bg-blue-100 border border-blue-300'
                : 'bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <div className="font-semibold text-sm">{project.projectName}</div>
            <div className="text-xs text-gray-500">
              {new Date(project.createdAt?.toDate?.()).toLocaleDateString()}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
```

Files:
* src/components/sidebar/ProjectList.jsx - New project list component

Success criteria:
* Component lists all projects owned by current user
* Clicking project calls `onSelectProject` with projectId
* Active project highlighted with blue border
* Empty state message when no projects exist
* No console errors

Context references:
* Firestore Queries: https://firebase.google.com/docs/firestore/query-data/queries
* Existing sidebar component patterns

Dependencies:
* Step 3.1 completion (store userId and activeProjectId)

### Step 4.2: Create new project/delete project UI with confirm dialogs

Create new file `src/components/ProjectActions.jsx` for create/delete buttons:

```javascript
import { useState } from 'react';
import { collection, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import usePlannerStore from '../../store/usePlannerStore';

export default function ProjectActions({ onProjectCreated, onProjectDeleted }) {
  const { userId, activeProjectId, getProjectSnapshot } = usePlannerStore();
  const [projectName, setProjectName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateProject = async () => {
    if (!projectName.trim() || !userId) return;

    try {
      setCreating(true);
      const docRef = await addDoc(collection(db, 'projects'), {
        projectName: projectName.trim(),
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        data: {
          components: [
            {
              id: 'root-app',
              type: 'component',
              name: 'App',
              description: '',
              parentId: null,
              position: { x: 200, y: 150 },
              size: { width: 220, height: 80 },
              deckId: null,
              groupIds: [],
            },
          ],
          groups: [],
          states: [],
          decks: [],
          settings: {},
        },
      });

      setProjectName('');
      onProjectCreated?.(docRef.id);
    } catch (err) {
      console.error('Failed to create project:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!activeProjectId || !window.confirm('Delete this project? This cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'projects', activeProjectId));
      onProjectDeleted?.();
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  return (
    <div className="p-4 space-y-2 border-t border-gray-200">
      <div className="flex gap-2">
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
          placeholder="New project name..."
          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-blue-400"
        />
        <button
          onClick={handleCreateProject}
          disabled={!projectName.trim() || creating}
          className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          Create
        </button>
      </div>

      {activeProjectId && (
        <button
          onClick={handleDeleteProject}
          className="w-full px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
        >
          Delete Project
        </button>
      )}
    </div>
  );
}
```

Files:
* src/components/ProjectActions.jsx - New project create/delete component

Success criteria:
* Input field accepts project name and clears after creation
* Create button triggers project creation with default App component
* Delete button only appears when project is active
* Confirm dialog prevents accidental deletion
* No console errors
* New projects appear in ProjectList after creation

Context references:
* Firestore addDoc/deleteDoc: https://firebase.google.com/docs/firestore/manage-data/add-data
* Existing store snapshot structure

Dependencies:
* Step 4.1 completion (ProjectList component)

### Step 4.3: Implement project switching with state load/clear on Firestore listener

Update `src/App.jsx` to handle project switching:

```javascript
import { useAuth } from './hooks/useAuth';
import { useFirestoreSync } from './hooks/useFirestoreSync';
import usePlannerStore from './store/usePlannerStore';

export default function App() {
  const { user, logout } = useAuth();
  const { setUserId, setActiveProjectId } = usePlannerStore();

  // Set userId in store when user logs in
  useEffect(() => {
    if (user) {
      setUserId(user.uid);
    } else {
      setUserId(null);
      setActiveProjectId(null); // Clear project on logout
    }
  }, [user, setUserId, setActiveProjectId]);

  // Sync active project from Firestore
  useFirestoreSync();

  const handleSelectProject = (projectId) => {
    setActiveProjectId(projectId);
  };

  const handleProjectDeleted = () => {
    setActiveProjectId(null); // Clear active project after deletion
  };

  // ... rest of App component
}
```

Files:
* src/App.jsx - Update auth effect to set userId; add project selection handler

Success criteria:
* userId is set in store when user logs in
* activeProjectId is cleared when user logs out
* Project switching triggers useFirestoreSync listener
* State loads from Firestore when project is selected
* State clears when project is deleted

Dependencies:
* All Phase 3 steps completed (store, sync hook, Firestore writes)

### Step 4.4: Update Sidebar to route to Projects/Components/States tabs based on user selection

Update `src/components/sidebar/Sidebar.jsx` to add Projects tab:

```javascript
import { useState } from 'react';
import ProjectList from './ProjectList';
import ProjectActions from '../ProjectActions';
import ComponentList from './ComponentList';
import StateList from './StateList';
import usePlannerStore from '../../store/usePlannerStore';

export default function Sidebar(props) {
  const [activeTab, setActiveTab] = useState('projects');
  const { activeProjectId, setActiveProjectId } = usePlannerStore();

  const handleSelectProject = (projectId) => {
    setActiveProjectId(projectId);
    setActiveTab('components');
  };

  return (
    <div className="w-64 bg-white border-r border-gray-300 flex flex-col">
      {/* Tab buttons */}
      <div className="flex border-b border-gray-300">
        <button
          onClick={() => setActiveTab('projects')}
          className={`flex-1 py-2 px-3 text-sm font-medium transition ${
            activeTab === 'projects'
              ? 'bg-blue-50 border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          Projects
        </button>
        <button
          onClick={() => setActiveTab('components')}
          disabled={!activeProjectId}
          className={`flex-1 py-2 px-3 text-sm font-medium transition ${
            activeTab === 'components'
              ? 'bg-blue-50 border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:bg-gray-50 disabled:opacity-50'
          }`}
        >
          Components
        </button>
        <button
          onClick={() => setActiveTab('states')}
          disabled={!activeProjectId}
          className={`flex-1 py-2 px-3 text-sm font-medium transition ${
            activeTab === 'states'
              ? 'bg-blue-50 border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:bg-gray-50 disabled:opacity-50'
          }`}
        >
          States
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'projects' && (
          <>
            <ProjectList onSelectProject={handleSelectProject} />
            <ProjectActions
              onProjectCreated={handleSelectProject}
              onProjectDeleted={() => {
                setActiveTab('projects');
              }}
            />
          </>
        )}
        {activeTab === 'components' && activeProjectId && (
          <ComponentList {...props} />
        )}
        {activeTab === 'states' && activeProjectId && (
          <StateList {...props} />
        )}
      </div>
    </div>
  );
}
```

Files:
* src/components/sidebar/Sidebar.jsx - Add Projects tab and routing

Success criteria:
* Sidebar has three tabs: Projects, Components, States
* Projects tab is always enabled
* Components and States tabs are disabled when no project is active
* Selecting a project switches to Components tab
* Project creation auto-switches to Components tab
* No console errors

Dependencies:
* Step 4.1 and 4.2 completed (ProjectList and ProjectActions components)

---

## Implementation Phase 5: Validation and Testing

<!-- parallelizable: false -->

### Step 5.1: Validate authentication flow (login, logout, session persistence)

Manual testing checklist:
1. Start dev server: `npm run dev`
2. Navigate to localhost:5173
3. Verify Sign in with Google button is visible
4. Click button and complete Google OAuth flow
5. Verify user email appears in top-right corner
6. Verify Projects tab loads with empty state message
7. Refresh page (Cmd+R or Ctrl+R)
8. Verify user is still logged in (session persists)
9. Click Logout button
10. Verify redirected to sign-in screen
11. Clear browser cookies and LocalStorage via DevTools
12. Refresh page; verify still signed out

Files:
* None (manual testing only)

Success criteria:
* All steps above complete without errors
* Session persists across refresh
* Logout clears all auth state
* No console errors related to Firebase Auth
* onAuthStateChanged listener fires correctly

Context references:
* Test credentials: Use personal Google account or Firebase Test User in Console

Dependencies:
* All Phase 2 steps completed

### Step 5.2: Test real-time sync (create component, verify appears in Firestore, load in new window)

Manual testing checklist:
1. Ensure authenticated and project is active
2. Go to Components tab
3. Create new component (drag on canvas or use Add Component UI)
4. Open Firebase Console → Firestore → projects collection
5. Find active project document and verify new component appears in `data.components` array
6. Open Firebase Console → check `updatedAt` timestamp (should be recent)
7. Open app in a new browser tab (same domain, same project)
8. Verify new component appears in second tab without page refresh (real-time listener)
9. Create component in second tab
10. Switch back to first tab and verify it appears in real-time

Files:
* None (testing only)

Success criteria:
* Component data persists to Firestore within ~2 seconds
* Firestore Console shows updated data and timestamp
* Real-time listeners sync across multiple tabs/windows
* No console errors related to sync

Context references:
* Firebase Console: https://console.firebase.google.com/project/_/firestore/data

Dependencies:
* Steps 3.1-3.3 completed (sync layer implemented)

### Step 5.3: Test project management (create, delete, switch projects)

Manual testing checklist:
1. Go to Projects tab
2. Enter project name "Test Project 1" and click Create
3. Verify project appears in list and is highlighted (active)
4. Verify Components and States tabs are now enabled
5. Create a component in Test Project 1
6. Create another project "Test Project 2" via input field
7. Verify switching to Test Project 2 shows empty canvas (no components from Test Project 1)
8. Create a component in Test Project 2
9. Switch back to Test Project 1
10. Verify component from Test Project 1 is still there
11. Go to Test Project 2 and click Delete Project
12. Confirm deletion in dialog
13. Verify project is removed from list
14. Verify sidebar shows "No projects yet" message

Files:
* None (testing only)

Success criteria:
* Projects are created with correct names
* Project list updates in real-time
* Switching projects loads correct state
* Each project maintains separate state
* Deletion removes project from Firestore and UI
* No console errors

Dependencies:
* Steps 4.1-4.4 completed (project management UI)

### Step 5.4: Test offline behavior (disable network, create component, verify queued and syncs on reconnect)

Manual testing checklist (Chrome DevTools):
1. Open DevTools → Network tab
2. Go to Components tab with active project
3. Right-click Network tab → Offline
4. Create a new component on canvas
5. Open DevTools → Application → IndexedDB → verify local data is written
6. Verify offline indicator appears at bottom-left
7. Refresh page; verify component is still there (offline persistence)
8. Right-click Network tab → Online (re-enable connection)
9. Verify offline indicator disappears
10. Open Firebase Console and verify new component appears in Firestore (synced)
11. Open app in new tab; verify component appears (synced via listener)

Files:
* None (testing only)

Success criteria:
* Offline indicator displays when network unavailable
* Changes persist locally via IndexedDB
* Changes sync to Firestore when reconnected
* No console errors
* Firestore eventually shows queued changes

Dependencies:
* Steps 3.4 completed (offline support implemented)

### Step 5.5: Run full build and validate bundle size impact

Run build and check output:

```bash
npm run build
```

Verify:
1. Build completes without errors
2. Output shows bundle sizes (should be ~170-180KB total with Firebase)
3. No TypeScript errors
4. No ESLint errors (run `npm run lint` if needed)

Files:
* None (build validation only)

Success criteria:
* Build passes with exit code 0
* Bundle size increase is within 35-45KB (Firebase modular SDK)
* No console errors during build
* No TypeScript errors reported
* Production bundle is ready for deployment

Context references:
* package.json build script: `vite build`

Dependencies:
* All previous phases completed

---

## Summary

This implementation plan breaks Firebase integration into 5 sequential phases covering authentication, real-time sync, and project management. Each phase builds on the previous one, with clear dependencies and measurable success criteria.
