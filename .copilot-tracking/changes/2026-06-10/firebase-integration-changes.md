<!-- markdownlint-disable-file -->
# Release Changes: Firebase Real-Time Integration for ReactPlanner

**Related Plan**: firebase-integration-plan.instructions.md
**Implementation Date**: 2026-06-10

## Summary

Implementation of single-user real-time Firebase persistence, Google authentication, and project management system for ReactPlanner. Users authenticate via Google accounts, create/manage multiple projects, and all modifications auto-save to Firestore with real-time synchronization across devices. Includes offline support via Firestore persistence.

## Changes

### Phase 1: Firebase Setup and Configuration ✅

#### Added

* `.env.local` - Firebase configuration file with placeholder values (VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_MESSAGING_SENDER_ID, VITE_FIREBASE_APP_ID)
* `src/config/firebase.js` - Firebase initialization module exporting auth, db, and app instances; includes IndexedDB offline persistence with error handling

#### Modified

* `package.json` - Added `"firebase": "^11.0.0"` to dependencies
* `src/App.jsx` - Added Firebase auth connection test listener (lines 10-19); imports auth and onAuthStateChanged from firebase/auth

### Phase 2: Google Authentication UI and Flow ✅

#### Added

* `src/hooks/useAuth.js` - Authentication hook with auth state listener and Google sign-in/sign-out actions
* `src/components/AuthGuard.jsx` - Guard component that blocks unauthenticated rendering of planner content

#### Modified

* `src/App.jsx` - Added sign-in screen, loading state, authenticated shell, logout control, and auth error display

### Phase 3: Firestore Sync Layer (Real-Time Listeners and Writes) ✅

#### Added

* `src/hooks/useFirestoreSync.js` - Real-time Firestore listener hook for active project documents with sync error handling
* `src/utils/firestoreSync.js` - Firestore persistence helpers for save/create/delete plus auto-save wrapper logic
* `src/components/OfflineIndicator.jsx` - Network status indicator for offline behavior visibility

#### Modified

* `src/store/usePlannerStore.js` - Added `userId`, `activeProjectId`, `syncError`, snapshot import/export helpers, project create/delete actions, and wrapped mutating actions with Firestore auto-save
* `src/App.jsx` - Integrated `useFirestoreSync`, wired authenticated `userId` into store state, rendered offline indicator, and surfaced sync error banner
* `package-lock.json` - Updated dependency lockfile after Firebase dependency install

#### Validation

* `npm run build` passed successfully
* `npm run lint` failed due existing repository lint issues, including one pre-existing rule hit in `src/App.jsx` (`react-hooks/set-state-in-effect`) and unrelated unused variable issues in other files

### Phase 4: Project Management UI and Store Integration ✅

#### Added

* `src/components/sidebar/ProjectList.jsx` - Added project list UI with Firestore project subscription, project creation, active project selection, and delete confirmation flow

#### Modified

* `src/components/sidebar/Sidebar.jsx` - Added Projects tab, routed tab content to project management view, disabled Components/States tabs when no active project, and wired project selection handling
* `src/App.jsx` - Reworked component selection/filter handlers to avoid effect-driven state updates and gated canvas rendering behind active project selection
* `src/components/sidebar/ComponentList.jsx` - Removed unused deck mapping references and recursive prop plumbing to satisfy lint checks
* `src/components/structure/GenerateStructureModal.jsx` - Removed unused `structureToTerminalCommands` import
* `src/utils/componentFilters.js` - Removed unused subtree expansion helper not referenced by current filter pipeline
* `src/utils/generateProjectStructure.js` - Removed unused imports/variables and simplified unused template parameter

#### Validation

* `npm run lint` passed successfully
* `npm run build` passed successfully

## Additional or Deviating Changes

* The Firestore auto-save wrapper in `src/utils/firestoreSync.js` accepts callbacks from the store instead of importing store state directly
   * Reason: avoids circular coupling and keeps the store module ownership clear while preserving existing action return behavior
* `createProject` and `deleteProject` were implemented in Phase 3
   * Reason: details listed placeholders for Step 3.1, but Phase 3 requires practical sync and project document operations to validate listener/write behavior end-to-end
* `package-lock.json` changed as part of dependency reconciliation
   * Reason: dependency metadata update required by npm after installing Firebase
* Project list loading UX avoids synchronous effect state setters in `ProjectList`
   * Reason: repository lint policy enforces callback-based effect updates (`react-hooks/set-state-in-effect`)

## Manual Configuration Required for Phase 1 Completion

⚠️ **User action required before proceeding to Phase 2:**

1. Create Firebase project at https://console.firebase.google.com
   - Note the Project ID, API Key, Auth Domain, Storage Bucket, Messaging Sender ID, App ID
   
2. Populate `.env.local` with Firebase config values:
   ```
   VITE_FIREBASE_API_KEY=<your-key>
   VITE_FIREBASE_AUTH_DOMAIN=<your-domain>
   VITE_FIREBASE_PROJECT_ID=<your-project-id>
   VITE_FIREBASE_STORAGE_BUCKET=<your-bucket>
   VITE_FIREBASE_MESSAGING_SENDER_ID=<your-id>
   VITE_FIREBASE_APP_ID=<your-app-id>
   ```

3. Enable Google Sign-In in Firebase Console:
   - Authentication → Sign-in method → Google → Enable

4. Deploy Firestore Security Rules in Firebase Console:
   - Firestore Database → Rules → Replace with rules from plan
   - Click Publish

5. Test connection:
   - Run `npm run dev`
   - Open browser console and verify "Firebase Auth Ready" message
   
Once complete, Phase 4 implementation can proceed.

## Release Summary

Current implementation status: Phases 2, 3, and 4 are complete. The release now includes authenticated Firebase sync, Firestore-backed project create/delete/switch flows, and sidebar routing for Projects/Components/States with active-project gating. Lint and build both pass after remediation cleanup. Remaining planned work is Phase 5 manual validation (auth/session persistence, real-time multi-window checks, offline queue verification) and bundle optimization follow-up for the >500 kB chunk warning.
