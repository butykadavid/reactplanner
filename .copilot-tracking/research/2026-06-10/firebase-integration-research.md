<!-- markdownlint-disable-file -->
# Research: Firebase Real-Time Integration for ReactPlanner

## Scope

This research document covers the technical foundation for integrating Firebase (Authentication + Firestore) into ReactPlanner for single-user real-time persistence and project management.

**Target Outcomes:**
- Google authentication flow in React
- Real-time Firestore synchronization with Zustand store
- Project CRUD operations and switching
- Offline persistence strategy
- Security rules for single-user projects

## Key Findings

### Firebase SDK v9+ with React

**Tree-Shakeable Modular Import:**
- Import only needed modules: `firebase/app`, `firebase/auth`, `firebase/firestore`
- Reduces bundle impact (estimated +30-40KB gzipped for auth + firestore)
- Works natively with React hooks (no wrapper library needed)

**Real-Time Listeners Pattern:**
```javascript
import { onSnapshot } from 'firebase/firestore';

useEffect(() => {
  const unsubscribe = onSnapshot(docRef, (snapshot) => {
    // Update store when Firestore changes
    updateStore(snapshot.data());
  });
  return unsubscribe; // cleanup on unmount
}, [dependencies]);
```

**Write Operations:**
- `setDoc(docRef, data)` for full document replacement
- `updateDoc(docRef, { field: value })` for partial updates
- Automatic client timestamp tracking with `serverTimestamp()`

### Firestore Schema Design for ReactPlanner

**Document Structure:**
```
/projects/{projectId}
  ├─ projectName: string
  ├─ userId: string (owner)
  ├─ createdAt: timestamp
  ├─ updatedAt: timestamp
  ├─ data: object (complete serialized state)
  │   ├─ components: []
  │   ├─ groups: []
  │   ├─ states: []
  │   ├─ decks: []
  │   └─ settings: {}
  └─ metadata: object
      ├─ componentCount: number
      ├─ lastModifiedAt: timestamp
      └─ version: number
```

**Alternative: Denormalized Fields**
- Pro: Fewer reads, simpler listeners
- Con: Larger documents, harder to update individual components later
- Decision: Use denormalized `data` field for v1 (simpler sync); refactor to subcollections in v2

### Google Authentication

**Firebase Auth Setup:**
- Google Sign-In provider enabled in Firebase Console
- Client-side redirect URI: `localhost:5173` (dev) / `production-domain.com` (prod)
- Firebase automatically manages OAuth tokens
- `onAuthStateChanged()` listener for persistent session tracking

**React Integration Pattern:**
```javascript
import { onAuthStateChanged } from 'firebase/auth';

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) setCurrentUser(user); // userId = user.uid
    else setCurrentUser(null);
  });
  return unsubscribe;
}, []);
```

### Real-Time Sync Strategy

**Optimistic Updates (Recommended for v1):**
1. User makes change locally
2. Zustand store updates immediately
3. Firestore write fires async in background
4. Success/error handled (could surface retry UI later)

**Conflict Resolution (Single-user, Not Needed Yet):**
- Last-Write-Wins is acceptable for single-user
- Track `updatedAt` timestamp on document
- Multi-user would require operational transforms or CRDT (future work)

### Offline Persistence

**Firestore Offline Mode (Built-in):**
- Enable with `enableIndexedDbPersistence(db)` after auth setup
- Automatically persists local writes and caches
- Works without explicit configuration
- Syncs when connection restored

### Security Rules (Single-User Model)

**Basic Rules:**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /projects/{projectId} {
      allow read, write: if request.auth.uid == resource.data.userId;
      allow create: if request.auth.uid == request.resource.data.userId;
    }
  }
}
```

**Rationale:**
- Users can only read/write their own projects (userId match)
- New projects can only be created by authenticated owner

## Constraints & Assumptions

- **Single-user for now:** Multi-user presence/conflict resolution deferred to v2
- **No real-time collab:** Each user has isolated projects; no shared editing yet
- **JSON serialization:** State exported as single document (not granular subcollections) for simplicity
- **Firebase CLI not required:** Can bootstrap via Firebase Console UI only
- **React v19+ hooks:** Async state management via useEffect + Zustand works seamlessly
- **No authentication UI framework:** Build custom login/logout with Firebase SDK only

## Technical Debt & Future Considerations

1. **Subcollections for scalability:** Refactor `data` document into granular `/projects/{projectId}/components/{componentId}` if single document grows beyond 1MB
2. **Batch writes:** Use `writeBatch()` for multi-collection updates (e.g., deleting project + related data)
3. **Caching strategy:** Consider caching metadata separately from full data for faster project list loads
4. **Activity logging:** Firestore may benefit from audit trail (separate `/projects/{projectId}/activity` collection) for undo/redo in future
5. **Rate limiting:** No rate-limiting rules yet; add if abuse becomes concern

## Dependencies to Add

```json
{
  "firebase": "^11.0.0",
  "google-auth-library": "bundled by Firebase SDK"
}
```

**Bundle Impact:**
- Firebase v11 modular: ~35-45KB gzipped (auth + firestore combined)
- Current bundle: 134KB → ~170-180KB with Firebase

## Recommended Implementation Order

1. Firebase project setup (Console only, no CLI)
2. Environment variable configuration (.env.local)
3. Firebase initialization module
4. Google Auth UI + flow (login/logout in App.jsx)
5. Firestore listener + sync layer
6. Store modifications for userId and activeProjectId
7. Project management UI (create/delete/switch)
8. Real-time write integration (every store mutation triggers Firestore update)
9. Testing and error handling

## Success Criteria (Planning Phase)

- Schema designed and documented
- Authentication flow understood
- Sync strategy defined with clear optimistic-update pattern
- Security rules drafted
- Bundle size impact estimated
- No blocking technical unknowns
