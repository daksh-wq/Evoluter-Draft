# 🎨 UI Component Reference - Evoluter

> **Quick reference guide for all UI components in the Evoluter platform**

---

## 📁 Component Organization

```
src/components/
├── views/          # Full-page views (13 components)
├── dashboard/      # Dashboard-specific components (4 components)
├── test/           # Test/quiz components (3 components)
├── layout/         # Layout components (2 components)
└── common/         # Reusable UI elements (4 components)
```

---

## 🏠 Views (`src/components/views/`)

### 1. **HomeView.jsx**
Landing page for unauthenticated users
- Hero section with CTA
- Feature highlights
- Premium design aesthetic

**Props:**
- `onGetStarted: () => void` - Navigate to login

---

### 2. **LoginView.jsx**
Authentication interface
- Google OAuth sign-in
- Email/password login
- Email/password signup
- Error handling display

**Props:**
- `handleGoogleLogin: () => Promise<void>`
- `handleEmailLogin: (email, password) => Promise<void>`
- `handleEmailSignup: (email, password, displayName) => Promise<void>`
- `authLoading: boolean`
- `loginError: string | null`

---

### 3. **OnboardingView.jsx**
First-time user setup flow
- Multi-step onboarding
- User preferences collection
- Welcome message

**Props:**
- `user: Object` - Firebase user object
- `onComplete: () => void` - Called after onboarding

---

### 4. **Dashboard.jsx**
Main command center
- User statistics cards
- Knowledge graph visualization
- Quick action buttons
- AI test generator
- Progress overview

**Props:**
- `userStats: Object` - User statistics
- `setView: (view: string) => void` - Navigation
- `generateAITest: (topic, count, difficulty) => Promise<void>`
- `isGeneratingTest: boolean`
- `generationProgress: number`
- `startMission: () => void` - Start mock test

---

### 5. **TestView.jsx**
MCQ practice interface
- Question display
- Answer selection
- Timer countdown
- Navigation controls
- Mark for review
- Zen mode toggle

**Props:**
- `test: Object` - Test data
- `currentIndex: number`
- `currentQuestion: Object`
- `answers: Object`
- `markedForReview: Set`
- `timeLeft: number`
- `goToNext: () => void`
- `goToPrev: () => void`
- `goToQuestion: (index) => void`
- `selectAnswer: (answer) => void`
- `toggleMarkForReview: () => void`
- `endTest: () => void`
- `isZenMode: boolean`
- `toggleZenMode: () => void`

---

### 6. **ResultView.jsx**
Test results and analytics
- Score summary
- Correct/incorrect breakdown
- Topic-wise analysis
- Question review
- Explanations

**Props:**
- `test: Object`
- `answers: Object`
- `results: Object`
- `exitTest: () => void`

---

### 7. **LibraryView.jsx**
PDF resource management
- Upload interface
- Document grid/list view
- Search and filter
- Extract questions from PDFs
- Delete documents

**Props:**
- `docs: Array<Object>` - Document list
- `handleFileUpload: (file) => Promise<void>`
- `uploadingDoc: boolean`
- `onDeleteDoc: (docId) => void`
- `onExtractQuestions: (doc) => void`

---

### 8. **MainsEvaluatorView.jsx**
AI-powered essay evaluation
- Text input area
- Word count
- AI analysis results
- Score out of 10
- Keyword detection
- Improvement suggestions

**Props:**
- `mainsText: string`
- `setMainsText: (text) => void`
- `analyzingMains: boolean`
- `handleMainsAnalysis: () => Promise<void>`
- `mainsResult: Object | null`

---

### 9. **SyllabusView.jsx**
UPSC syllabus tracker
- GS Paper 1, 2, 3, 4 breakdown
- Progress bars for each topic
- Topic-wise completion status
- Interactive syllabus navigation

**Props:** None (self-contained)

---

### 10. **NewsView.jsx**
Current affairs feed
- AI-curated news articles
- Category filtering (Polity, Economy, Science, etc.)
- Save/bookmark functionality
- Share options

**Props:** None (uses mock data)

---

### 11. **LeaderboardView.jsx**
Rankings and competition
- Weekly leaderboard
- User rank display
- XP and level comparison
- Status tier badges

**Props:** None (uses mock data)

---

### 12. **ProfileView.jsx**
User profile and settings
- User information display
- Statistics overview
- Logout button
- Account settings

**Props:**
- `user: Object` - Firebase user
- `userData: Object` - User stats and data
- `onLogout: () => void`

---

## 📊 Dashboard Components (`src/components/dashboard/`)

### StatCard.jsx
Display key metrics
- XP, Level, Streak, Accuracy
- Icon + value + label
- Animated effects

### KnowledgeGraph.jsx
Visual mastery tracking
- Interactive topic nodes
- Mastery percentage
- Color-coded strength levels

### QuickActions.jsx
Action button grid
- Start Test, Library, Syllabus, etc.
- Icon-based navigation

### AITestGenerator.jsx
AI question generation UI
- Topic input
- Question count selector
- Difficulty selector
- Generate button with loading state

---

## 📝 Test Components (`src/components/test/`)

### QuestionCard.jsx
Individual question display
- Question text
- Options (A, B, C, D)
- Selected state indicator

### QuestionNavigator.jsx
Question grid navigator
- All question numbers
- Answered/unanswered/marked status
- Click to jump to question

### TestTimer.jsx
Countdown timer display
- Time remaining
- Warning when low (red at < 5 min)
- Auto-submit at 0:00

---

## 🔲 Layout Components (`src/components/layout/`)

### Sidebar.jsx
Main navigation sidebar
- Logo/branding
- Navigation menu items
- Active state highlighting
- User profile section
- Logout button
- Responsive (collapsible on mobile)

**Props:**
- `currentView: string`
- `onNavigate: (view) => void`
- `onLogout: () => void`
- `navItems: Array<Object>`
- `user: Object`

---

## 🧩 Common Components (`src/components/common/`)

### GlobalStyles.jsx
Global CSS injections and theme setup

### Button.jsx (if exists)
Reusable button component with variants

### Card.jsx (if exists)
Reusable card wrapper

### Modal.jsx (if exists)
Dialog/modal component

---

## 🎨 Component Design Patterns

### Color Usage
```jsx
// Primary actions
className="bg-blue-600 hover:bg-blue-700 text-white"

// Secondary actions
className="bg-slate-200 hover:bg-slate-300 text-slate-900"

// Success states
className="bg-emerald-500 text-white"

// Error states
className="bg-red-500 text-white"

// Neutral containers
className="bg-white border border-slate-200"
```

### Spacing Conventions
```jsx
// Card padding
className="p-6 lg:p-8"

// Stack spacing (vertical)
className="space-y-4"

// Grid gaps
className="gap-4 lg:gap-6"

// Section margins
className="mb-6 lg:mb-8"
```

### Responsive Patterns
```jsx
// Mobile-first grid
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"

// Responsive text
className="text-base md:text-lg lg:text-xl"

// Conditional visibility
className="hidden md:block" // Show on tablet+
className="block md:hidden" // Show on mobile only
```

### Loading States
```jsx
{isLoading ? (
  <RefreshCw className="animate-spin" size={20} />
) : (
  <CheckCircle size={20} />
)}
```

### Empty States
```jsx
{items.length === 0 ? (
  <div className="text-center py-12 text-slate-500">
    <FileX size={48} className="mx-auto mb-4" />
    <p>No items found</p>
  </div>
) : (
  // Render items
)}
```

---

## 🔧 Creating New Components

### Template for New Component

```jsx
import React from 'react';
import { SomeIcon } from 'lucide-react';

/**
 * ComponentName - Brief description
 * 
 * @param {Object} props
 * @param {string} props.title - Description
 * @param {Function} props.onClick - Description
 */
export default function ComponentName({ title, onClick }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-2">
        {title}
      </h3>
      <button
        onClick={onClick}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Click Me
      </button>
    </div>
  );
}
```

---

## 📦 Component Exports

All components are exported through index files for clean imports:

```javascript
// src/components/views/index.js
export { default as Dashboard } from './Dashboard';
export { default as TestView } from './TestView';
export { default as LoginView } from './LoginView';
// ... etc

// Usage in App.jsx
import { Dashboard, TestView, LoginView } from './components/views';
```

---

## 🎯 UI Enhancement Checklist

When working on UI components:

- [ ] **Responsive design** - Test on mobile, tablet, desktop
- [ ] **Loading states** - Add spinners/skeletons for async operations
- [ ] **Empty states** - Handle no data scenarios gracefully
- [ ] **Error states** - Display user-friendly error messages
- [ ] **Hover effects** - Add visual feedback on interactive elements
- [ ] **Focus states** - Ensure keyboard navigation works
- [ ] **Accessibility** - Add ARIA labels, alt text
- [ ] **Consistent spacing** - Follow spacing conventions
- [ ] **Icon usage** - Use Lucide React icons consistently
- [ ] **Typography** - Use Inter font, consistent font sizes

---

**Component Reference Complete! 🎉**

Refer to individual component files for implementation details.
