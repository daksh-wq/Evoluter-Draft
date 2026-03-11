# Bug Fix Implementation Plan

This plan addresses the issues reported in `BUG_REPORT.md`, prioritized by criticality and impact.

## Phase 1: Security & Configuration (High Priority)
*Objective: Secure API keys and ensure environment stability.*

1.  **Secure Firebase Credentials (Issue #4)**
    *   **Action**: Move hardcoded Firebase config from `src/services/firebase.js` to `.env` (or `.env.local`).
    *   **Files**: `src/services/firebase.js`, `.env`
    *   **Details**: Create environment variables like `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, etc. Update `firebase.js` to access these via `import.meta.env`.

2.  **Gemini API Key Check (Issue #5)**
    *   **Action**: Ensure `VITE_GEMINI_API_KEY` is properly handled and authenticated.
    *   **Files**: `src/services/geminiService.js`, `.env`
    *   **Details**: Verify `.env` setup. The warning log is actually good practice, but we'll ensure the key is present in the `env` file we create.

## Phase 2: Critical Bug Fixes (High Priority)
*Objective: Fix broken functionality that blocks user access or corrupts data.*

3.  **Fix Mobile Navigation (Issue #1)**
    *   **Action**: Implement a responsive navigation system.
    *   **Files**: `src/components/layout/Sidebar.jsx`, `src/App.jsx`
    *   **Details**:
        *   Create a `MobileNav` component (floating action button or bottom bar) or add a Hamburger Menu to `App.jsx` header.
        *   Use a state `isSidebarOpen` in `App.jsx` to toggle the `Sidebar` visibility on mobile (removing `hidden` class conditionally).

4.  **Fix "Ghost" Test Records (Issue #2 & #8)**
    *   **Action**: Ensure Test ID consistency between start and submit.
    *   **Files**: `src/hooks/useTest.js`
    *   **Details**:
        *   In `startAITest`/`startMockTest`, generate the `testId` immediately and store it in a new state variable `activeTestId`.
        *   In `submitTest`, use `activeTestId` to update the *existing* document instead of creating a new one.
        *   **Bonus**: Remove duplicate `setCurrentQuestionIndex(0)` calls (Issue #8).

5.  **Fix Broken "Flashcards" Link (Issue #3)**
    *   **Action**: implementations the missing Flashcards view.
    *   **Files**: `src/App.jsx`, `src/components/views/FlashcardsView.jsx` (New File)
    *   **Details**:
        *   Create a basic `FlashcardsView.jsx` placeholder component.
        *   Import it in `App.jsx`.
        *   Add condition: `{view === 'flashcards' && <FlashcardsView />}`.

## Phase 3: Logic & State Refinements (Medium Priority)
*Objective: Improve data accuracy and user experience.*

6.  **Fix XP & Leveling Logic (Issue #7)**
    *   **Action**: Implement level calculation logic.
    *   **Files**: `src/services/userService.js`
    *   **Details**:
        *   fetch current user stats before updating.
        *   Calculate new level: `Math.floor(newXP / 1000) + 1`.
        *   Update `level` field in Firestore along with XP.

7.  **Optimize Onboarding Flow (Issue #6)**
    *   **Action**: Remove full page reload.
    *   **Files**: `src/App.jsx`, `src/hooks/useAuth.js`
    *   **Details**:
        *   Add a `refreshUser` function to `useAuth` that re-fetches the user profile from Firestore.
        *   Call `refreshUser()` instead of `window.location.reload()` in `handleOnboardingComplete`.

8.  **Relax Strict MCQ Filtering (Issue #10)**
    *   **Action**: Allow questions with non-4 options.
    *   **Files**: `src/services/geminiService.js`
    *   **Details**: Change filter to `q.options.length >= 2`.

## Phase 4: UX Enhancements (Low Priority)
*Objective: Polish features and modernize architecture.*

9.  **Implement Real File Uploads (Issue #9)**
    *   **Action**: Replace mock `setTimeout` with Firebase Storage upload.
    *   **Files**: `src/App.jsx`, `src/services/firebase.js`
    *   **Details**:
        *   Import `uploadBytes`, `getDownloadURL` in `firebase.js` (or a new storage service).
        *   Update `handleFileUpload` in `App.jsx` to upload the file and get the URL before saving the metadata to Firestore.

10. **Migrate to React Router (Issue #11)**
    *   **Action**: Replace state-based routing with `react-router-dom`.
    *   **Files**: `src/App.jsx`, `src/main.jsx` (or `index.jsx`), and all components using `setView`.
    *   **Details**:
        *   Install `react-router-dom`.
        *   Define routes in `App.jsx` (`/dashboard`, `/test`, `/library`, etc.).
        *   Replace `setView` calls with `useNavigate` hook.
        *   Update `Sidebar` links to `<Link>` or `NavLink`.
    *   *Note*: This is a significant refactor and should be done last to maximize stability during the bug fixes.
