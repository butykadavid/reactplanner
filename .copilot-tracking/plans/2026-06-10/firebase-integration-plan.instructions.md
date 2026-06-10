---
applyTo: '.copilot-tracking/changes/2026-06-10/firebase-integration-changes.md'
---
<!-- markdownlint-disable-file -->
# Implementation Plan: Firebase Real-Time Integration for ReactPlanner

## Overview

Add single-user real-time Firebase persistence, Google authentication, and project management to ReactPlanner. Users can authenticate via Google, create/delete/switch between projects, and all modifications auto-save to Firestore in real-time.

## Objectives

### User Requirements

* Implement real-time saving to Firebase for project state — Source: User request
* Support Google account authentication only — Source: User request
* Add project management UI (create, delete, switch between projects) — Source: User request
* Persist user's projects so they load on next session — Source: User request

### Derived Objectives

* Establish Firebase project configuration and environment variables — Derived from: Authentication and Firestore access requirements
* Create authentication module with Google Sign-In flow — Derived from: User authentication requirement
* Design Firestore schema for storing project metadata and state — Derived from: Real-time sync requirement
* Implement real-time listeners to sync Firestore to Zustand store — Derived from: Auto-save requirement
* Integrate Firestore writes into all store mutation actions — Derived from: Real-time sync requirement
* Build project management UI in sidebar — Derived from: User-stated project management requirement
* Add error handling and offline support — Derived from: Production robustness

## Context Summary

### Project Files

* src/store/usePlannerStore.js - Central Zustand store managing all application state (components, groups, states, decks, settings); will be extended with userId and activeProjectId
* src/App.jsx - Root component managing global state and UI layout; will be extended with auth state and project switching
* src/components/sidebar/Sidebar.jsx - Sidebar container for Components/States tabs; will include new Projects tab
* package.json - Current dependencies include Zustand, React, React Flow, Tailwind; will add Firebase v11
* .env.local - New file for Firebase configuration secrets

### References

* .copilot-tracking/research/2026-06-10/firebase-integration-research.md - Technical foundation for Firebase integration, Firestore schema, authentication flow, sync strategy
* Firebase Documentation: https://firebase.google.com/docs/web/setup
* Firestore Security Rules: https://firebase.google.com/docs/firestore/security/overview

### Standards References

* React 19 hooks patterns for useEffect, useState
* Zustand action patterns for store mutations
* Tailwind CSS for UI styling (consistent with existing components)

## Implementation Checklist

### [ ] Phase 1: Firebase Setup and Configuration

<!-- parallelizable: false -->

* [ ] Step 1.1: Create Firebase project in Google Console
  * Details: .copilot-tracking/details/2026-06-10/firebase-integration-details.md (Lines 8-25)
* [ ] Step 1.2: Install Firebase SDK and add .env.local configuration
  * Details: .copilot-tracking/details/2026-06-10/firebase-integration-details.md (Lines 26-50)
* [ ] Step 1.3: Create Firebase initialization module (src/config/firebase.js)
  * Details: .copilot-tracking/details/2026-06-10/firebase-integration-details.md (Lines 51-85)
* [ ] Step 1.4: Deploy Firestore security rules
  * Details: .copilot-tracking/details/2026-06-10/firebase-integration-details.md (Lines 86-105)
* [ ] Step 1.5: Validate Firebase connection with test listener
  * Details: .copilot-tracking/details/2026-06-10/firebase-integration-details.md (Lines 106-120)

### [x] Phase 2: Google Authentication UI and Flow

<!-- parallelizable: false -->

* [x] Step 2.1: Create authentication context/hook (src/hooks/useAuth.js)
  * Details: .copilot-tracking/details/2026-06-10/firebase-integration-details.md (Lines 121-170)
* [x] Step 2.2: Add Google Sign-In button and logout to App.jsx
  * Details: .copilot-tracking/details/2026-06-10/firebase-integration-details.md (Lines 171-210)
* [x] Step 2.3: Create AuthGuard wrapper component to redirect unauthenticated users
  * Details: .copilot-tracking/details/2026-06-10/firebase-integration-details.md (Lines 211-240)
* [x] Step 2.4: Test login/logout flow with Google account
  * Details: .copilot-tracking/details/2026-06-10/firebase-integration-details.md (Lines 241-255)

### [x] Phase 3: Firestore Sync Layer (Real-Time Listeners and Writes)

<!-- parallelizable: false -->

* [x] Step 3.1: Extend usePlannerStore with userId, activeProjectId, and project management actions
  * Details: .copilot-tracking/details/2026-06-10/firebase-integration-details.md (Lines 256-310)
* [x] Step 3.2: Create sync hook (src/hooks/useFirestoreSync.js) for real-time listeners
  * Details: .copilot-tracking/details/2026-06-10/firebase-integration-details.md (Lines 311-370)
* [x] Step 3.3: Integrate Firestore writes into store mutations (create wrapper for auto-save)
  * Details: .copilot-tracking/details/2026-06-10/firebase-integration-details.md (Lines 371-420)
* [x] Step 3.4: Add error handling and offline support (Firestore persistence + retry UI)
  * Details: .copilot-tracking/details/2026-06-10/firebase-integration-details.md (Lines 421-460)

### [x] Phase 4: Project Management UI and Store Integration

<!-- parallelizable: false -->

* [x] Step 4.1: Add Projects tab component (src/components/sidebar/ProjectList.jsx)
  * Details: .copilot-tracking/details/2026-06-10/firebase-integration-details.md (Lines 461-510)
* [x] Step 4.2: Create new project/delete project UI with confirm dialogs
  * Details: .copilot-tracking/details/2026-06-10/firebase-integration-details.md (Lines 511-550)
* [x] Step 4.3: Implement project switching with state load/clear on Firestore listener
  * Details: .copilot-tracking/details/2026-06-10/firebase-integration-details.md (Lines 551-585)
* [x] Step 4.4: Update Sidebar to route to Projects/Components/States tabs based on user selection
  * Details: .copilot-tracking/details/2026-06-10/firebase-integration-details.md (Lines 586-610)

### [ ] Phase 5: Validation and Testing

<!-- parallelizable: false -->

* [ ] Step 5.1: Validate authentication flow (login, logout, session persistence)
  * Details: .copilot-tracking/details/2026-06-10/firebase-integration-details.md (Lines 611-630)
* [ ] Step 5.2: Test real-time sync (create component, verify appears in Firestore, load in new window)
  * Details: .copilot-tracking/details/2026-06-10/firebase-integration-details.md (Lines 631-655)
* [ ] Step 5.3: Test project management (create, delete, switch projects)
  * Details: .copilot-tracking/details/2026-06-10/firebase-integration-details.md (Lines 656-675)
* [ ] Step 5.4: Test offline behavior (disable network, create component, verify queued and syncs on reconnect)
  * Details: .copilot-tracking/details/2026-06-10/firebase-integration-details.md (Lines 676-695)
* [ ] Step 5.5: Run full build and validate bundle size impact
  * Details: .copilot-tracking/details/2026-06-10/firebase-integration-details.md (Lines 696-710)

## Planning Log

See .copilot-tracking/plans/logs/2026-06-10/firebase-integration-log.md for discrepancy tracking, implementation paths considered, and suggested follow-on work.

## Dependencies

* firebase v11 (modular: @firebase/app, @firebase/auth, @firebase/firestore)
* React 19+ (already present)
* Zustand 5+ (already present)
* Environment variables: VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, etc.
* Google Console project with OAuth 2.0 credentials configured
* Firestore database initialized in Firebase project

## Success Criteria

* User can authenticate via Google Sign-In button — Traces to: User Requirement
* After login, user sees project list (initially empty or with existing projects) — Traces to: User Requirement
* User can create new project; state initializes with default App component — Traces to: User Requirement
* Every modification to components, groups, states, decks, or settings auto-saves to Firestore within 1 second — Traces to: User Requirement (real-time saves)
* User can switch between projects; active project state loads from Firestore — Traces to: User Requirement (project management)
* User can delete a project with confirmation dialog; project removed from Firestore and UI — Traces to: User Requirement (project management)
* Session persists: closing and reopening the app shows logged-in state and last active project — Traces to: User Requirement (persistence)
* Offline mode: user can continue editing; changes queue and sync when reconnected — Traces to: Derived Objective (offline support)
* Build passes with no errors; bundle size increases by ~35-45KB gzipped for Firebase — Traces to: Production readiness
