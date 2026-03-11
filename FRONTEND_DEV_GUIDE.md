# 🎨 Frontend Developer Guide - Evoluter

> **Comprehensive guide for frontend developers working on UI improvements for the Evoluter platform**

---

## 📚 Table of Contents

1. [Project Overview](#project-overview)
2. [Quick Start](#quick-start)
3. [Architecture & Code Structure](#architecture--code-structure)
4. [UI Component Guide](#ui-component-guide)
5. [Styling Guidelines](#styling-guidelines)
6. [State Management](#state-management)
7. [UI Improvement Areas](#ui-improvement-areas)
8. [Best Practices](#best-practices)
9. [Common Tasks](#common-tasks)

---

## 📋 Project Overview

**Evoluter** is an AI-powered exam preparation platform for UPSC and competitive exams built with:

### Tech Stack
- **React 19** - UI Framework
- **Vite 7** - Build tool & Dev Server
- **TailwindCSS 3** - Utility-first CSS
- **Lucide React** - Icons
- **Firebase** - Authentication & Database
- **Google Gemini AI** - Question generation & evaluation

### Current Features
✅ AI Question Generation  
✅ Resource Library (PDF Management)  
✅ Mains Answer Evaluator  
✅ Knowledge Graph & Analytics  
✅ Syllabus Tracker  
✅ Leaderboard & Gamification  
✅ Current Affairs Feed  

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+**
- **npm** or **yarn**
- Code editor (VS Code recommended)

### Setup Instructions

```bash
# 1. Clone/navigate to the project
cd /Volumes/Genartml/Evoluter/evoluter-engine

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Open browser
# Visit: http://localhost:5173/
```

### Demo Credentials
```
Student ID: student
Password: 123345
```

### Available Scripts
```bash
npm run dev      # Start dev server with HMR
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

---

## 🏗️ Architecture & Code Structure

### Project Structure
```
evoluter-engine/
├── public/                  # Static assets
├── src/
│   ├── App.jsx             # Main application (320 lines)
│   ├── App.css             # Component-specific styles
│   ├── main.jsx            # React entry point
│   ├── index.css           # Global styles + Tailwind
│   │
│   ├── components/         # UI Components
│   │   ├── views/          # Main view components
│   │   ├── layout/         # Layout components (Sidebar, etc.)
│   │   └── common/         # Reusable UI elements
│   │
│   ├── hooks/              # Custom React hooks
│   │   ├── useAuth.js      # Authentication logic
│   │   ├── useTest.js      # Test/quiz logic
│   │   └── index.js        # Hook exports
│   │
│   ├── services/           # External API services
│   │   ├── firebase.js     # Firebase config
│   │   └── geminiService.js # AI integration
│   │
│   ├── constants/          # App constants & data
│   │   └── data.js         # Static data, configs
│   │
│   └── utils/              # Helper functions
│
├── index.html              # HTML template
├── package.json            # Dependencies
├── tailwind.config.js      # Tailwind configuration
└── vite.config.js          # Vite configuration
```

### Architecture Pattern
- **Component-based architecture** (React functional components)
- **Custom hooks** for business logic separation
- **Centralized state** in `App.jsx` (props drilling pattern)
- **Service layer** for external API calls
- **View-based routing** (single-page app with view state)

---

## 🧩 UI Component Guide

### Main Views (`src/components/views/`)

All views are imported in `App.jsx` and rendered conditionally based on the `view` state:

| View | Component | Purpose |
|------|-----------|---------|
| **Home** | `HomeView` | Landing page (unauthenticated users) |
| **Login** | `LoginView` | Authentication screen |
| **Onboarding** | `OnboardingView` | First-time user setup |
| **Dashboard** | `Dashboard` | Main command center |
| **Test** | `TestView` | MCQ practice interface |
| **Result** | `ResultView` | Test results & analytics |
| **Library** | `LibraryView` | PDF management |
| **Mains Evaluator** | `MainsEvaluatorView` | Essay evaluation |
| **Syllabus** | `SyllabusView` | Progress tracking |
| **News** | `NewsView` | Current affairs feed |
| **Leaderboard** | `LeaderboardView` | Rankings |
| **Profile** | `ProfileView` | User profile |

### Layout Components (`src/components/layout/`)

- **Sidebar** - Main navigation (responsive, collapsible)

### Common Components (`src/components/common/`)

Reusable UI elements like buttons, cards, modals, etc.

### Component Import Pattern

All components are exported from their respective index files for clean imports:

```javascript
// In App.jsx
import { LoginView, Dashboard, TestView } from './components/views';
import { Sidebar } from './components/layout';
import { GlobalStyles } from './components/common';
```

---

## 🎨 Styling Guidelines

### TailwindCSS Conventions

#### Color Palette
The app uses **Tailwind's default color system** focused on:
- **Primary:** `blue-600`, `blue-500` (CTAs, links)
- **Background:** `slate-50` (main bg), `white` (cards)
- **Text:** `slate-900` (primary), `slate-600` (secondary)
- **Accents:** `emerald-500` (success), `red-500` (errors), `amber-500` (warnings)

#### Spacing System
Follows Tailwind's default spacing scale (4px increments):
```css
p-6   → padding: 1.5rem (24px)
mb-4  → margin-bottom: 1rem (16px)
gap-3 → gap: 0.75rem (12px)
```

#### Typography
```css
text-sm   → 14px (secondary text)
text-base → 16px (body text)
text-lg   → 18px (subheadings)
text-xl   → 20px (headings)
text-2xl  → 24px (page titles)
```

#### Responsive Breakpoints
```css
sm: 640px   → Mobile landscape
md: 768px   → Tablets
lg: 1024px  → Desktop
xl: 1280px  → Large desktop
```

### Custom Styles (`src/index.css`)

Global custom styles and animations are defined in `index.css`:

```css
/* Glassmorphism effects */
/* Custom animations (fade-in, slide-up, etc.) */
/* Scroll behavior */
/* Selection colors */
```

### Component-Specific Styles (`src/App.css`)

Additional component-specific styles that can't be achieved with Tailwind utilities.

---

## 🔄 State Management

### Current Pattern: Local State + Props Drilling

The app uses **React hooks** for state management with **props drilling** pattern:

#### Main App State (`App.jsx`)

```javascript
// Authentication
const { user, userData, isAuthenticated, ... } = useAuth();

// Navigation
const [view, setView] = useState('dashboard');
const [isZenMode, setIsZenMode] = useState(false);

// Test/Quiz
const { activeTest, currentQuestion, answers, ... } = useTest();

// Features
const [docs, setDocs] = useState([]);
const [mainsText, setMainsText] = useState('');
const [mainsResult, setMainsResult] = useState(null);
```

#### Custom Hooks

**`useAuth` Hook** (`src/hooks/useAuth.js`)
- Firebase authentication
- User data management
- Login/logout handlers

**`useTest` Hook** (`src/hooks/useTest.js`)
- Test state management
- Question navigation
- Answer tracking
- Test generation

### State Flow Diagram

```
App.jsx (Root State)
    ↓ props
Views (Dashboard, Test, Library, etc.)
    ↓ props
Common Components (Buttons, Cards, etc.)
```

### Potential Improvements for Large Teams
Consider migrating to:
- **Context API** - For reducing props drilling
- **Redux Toolkit** - For complex state management
- **Zustand** - Lightweight alternative to Redux
- **React Query** - For server state management

---

## 💡 UI Improvement Areas

### Recommended Focus Areas

#### 1. **Design System Standardization** 🎨
**Current State:** Inconsistent spacing, colors used directly in components  
**Improvement:**
- Create a centralized design token file
- Define color variables in `tailwind.config.js`
- Standardize component spacing and sizing

```javascript
// tailwind.config.js (Extended)
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          // ...
        },
        // Custom brand colors
      },
      spacing: {
        // Custom spacing if needed
      }
    }
  }
}
```

#### 2. **Component Library** 📦
**Current State:** UI elements scattered across views  
**Improvement:**
- Extract reusable components to `src/components/common/`
- Create a component library:
  - `Button.jsx` (primary, secondary, outline variants)
  - `Card.jsx` (different card styles)
  - `Input.jsx` (form inputs with validation)
  - `Modal.jsx` (dialog system)
  - `Badge.jsx` (tags, labels)
  - `ProgressBar.jsx`
  - `Tooltip.jsx`

#### 3. **Responsive Design Polish** 📱
**Current State:** Basic responsive layout  
**Improvement:**
- Test on multiple devices (mobile, tablet, desktop)
- Improve mobile navigation (hamburger menu)
- Optimize touch targets for mobile (min 44px)
- Test landscape orientation
- Add loading skeletons for better perceived performance

#### 4. **Animation & Micro-interactions** ✨
**Current State:** Basic fade-in animations  
**Improvement:**
- Add hover states to interactive elements
- Smooth page transitions
- Loading states with skeleton screens
- Success/error toast notifications
- Button press feedback
- Card hover effects
- Smooth scroll behavior

**Libraries to Consider:**
- `framer-motion` (already installed!)
- `react-spring`
- `GSAP`

#### 5. **Accessibility (a11y)** ♿
**Current State:** Basic HTML structure  
**Improvement:**
- Add proper ARIA labels
- Keyboard navigation support (Tab, Enter, Escape)
- Focus indicators (outline on interactive elements)
- Screen reader support
- Color contrast validation (WCAG AA)
- Skip navigation links
- Alt text for all images

#### 6. **Dark Mode** 🌙
**Not implemented**  
**Improvement:**
- Add dark mode toggle
- Use Tailwind's `dark:` variant
- Store preference in localStorage

```javascript
// Example dark mode setup
const [darkMode, setDarkMode] = useState(
  localStorage.getItem('theme') === 'dark'
);

useEffect(() => {
  document.documentElement.classList.toggle('dark', darkMode);
  localStorage.setItem('theme', darkMode ? 'dark' : 'light');
}, [darkMode]);
```

#### 7. **Performance Optimization** ⚡
**Improvement:**
- Code splitting with `React.lazy()` and `Suspense`
- Image optimization (WebP, lazy loading)
- Memoization for expensive renders (`useMemo`, `React.memo`)
- Virtual scrolling for long lists
- Debounce search inputs

#### 8. **Error Handling & Loading States** 🔄
**Current State:** Basic error handling  
**Improvement:**
- Better error boundaries
- User-friendly error messages
- Retry mechanisms
- Loading states for all async operations
- Empty states (no data scenarios)

---

## ✅ Best Practices

### Code Style

1. **Component Structure**
```jsx
// 1. Imports
import React, { useState, useEffect } from 'react';
import { SomeIcon } from 'lucide-react';

// 2. Component definition
export default function MyComponent({ prop1, prop2 }) {
  // 3. State
  const [state, setState] = useState(null);
  
  // 4. Effects
  useEffect(() => {
    // ...
  }, []);
  
  // 5. Handlers
  const handleClick = () => {
    // ...
  };
  
  // 6. Render
  return (
    <div className="container">
      {/* JSX */}
    </div>
  );
}
```

2. **Tailwind Class Order**
```jsx
// Layout → Size → Spacing → Colors → Text → Visual Effects
<div className="flex items-center w-full p-4 bg-white rounded-lg shadow-md">
```

3. **Naming Conventions**
- Components: `PascalCase` (e.g., `DashboardView`)
- Functions: `camelCase` (e.g., `handleSubmit`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_USER_STATS`)
- Files: Match component name (e.g., `Dashboard.jsx`)

4. **Props Destructuring**
```jsx
// ✅ Good
function Button({ onClick, children, variant = 'primary' }) {
  // ...
}

// ❌ Avoid
function Button(props) {
  return <button onClick={props.onClick}>{props.children}</button>;
}
```

### Git Workflow

```bash
# 1. Create feature branch
git checkout -b feature/ui-improvement-name

# 2. Make changes and commit
git add .
git commit -m "feat: add dark mode toggle to sidebar"

# 3. Push and create PR
git push origin feature/ui-improvement-name
```

### Commit Message Convention
```
feat: add new feature
fix: bug fix
style: formatting, missing semi-colons, etc
refactor: code restructuring
docs: documentation updates
test: adding tests
chore: maintenance tasks
```

---

## 🔧 Common Tasks

### 1. Adding a New View

**Step 1:** Create component file
```bash
touch src/components/views/MyNewView.jsx
```

**Step 2:** Define component
```jsx
// src/components/views/MyNewView.jsx
import React from 'react';

export default function MyNewView() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold text-slate-900">My New View</h1>
      {/* Content */}
    </div>
  );
}
```

**Step 3:** Export from index
```javascript
// src/components/views/index.js
export { default as MyNewView } from './MyNewView';
```

**Step 4:** Import in App.jsx
```javascript
import { MyNewView } from './components/views';
```

**Step 5:** Add to render logic
```jsx
{view === 'mynewview' && <MyNewView />}
```

**Step 6:** Add navigation (optional)
Update `NAV_ITEMS` in `src/constants/data.js`

---

### 2. Creating a Reusable Component

```jsx
// src/components/common/Button.jsx
import React from 'react';

const variants = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white',
  secondary: 'bg-slate-200 hover:bg-slate-300 text-slate-900',
  outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50',
};

export default function Button({ 
  children, 
  variant = 'primary', 
  onClick, 
  disabled = false,
  className = '',
  ...props 
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        px-4 py-2 rounded-lg font-medium transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
```

**Usage:**
```jsx
import Button from './components/common/Button';

<Button variant="primary" onClick={handleSave}>
  Save Changes
</Button>
```

---

### 3. Adding Custom Animations

**Option 1: CSS (in index.css)**
```css
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.slide-in {
  animation: slideIn 0.3s ease-out;
}
```

**Option 2: Framer Motion (already installed)**
```jsx
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  Content
</motion.div>
```

---

### 4. Implementing Dark Mode

**Step 1:** Extend Tailwind config
```javascript
// tailwind.config.js
export default {
  darkMode: 'class', // Enable class-based dark mode
  // ...rest of config
}
```

**Step 2:** Add dark mode styles
```jsx
<div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
  Content
</div>
```

**Step 3:** Create toggle hook
```javascript
// src/hooks/useDarkMode.js
import { useState, useEffect } from 'react';

export default function useDarkMode() {
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem('theme') === 'dark'
  );

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  return [darkMode, setDarkMode];
}
```

---

### 5. Firebase Integration (Already Setup)

**Configuration:** `src/services/firebase.js`

**Usage Example:**
```javascript
import { db } from './services/firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';

// Add document
await addDoc(collection(db, 'users', userId, 'docs'), {
  title: 'My Doc',
  createdAt: serverTimestamp(),
});

// Get documents
const querySnapshot = await getDocs(collection(db, 'users', userId, 'docs'));
const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
```

---

## 🐛 Debugging Tips

### React DevTools
Install React DevTools extension to inspect component hierarchy and state.

### Vite Hot Module Replacement (HMR)
Changes auto-refresh without full page reload. If something breaks:
```bash
# Stop server (Ctrl+C)
# Clear cache and restart
rm -rf node_modules/.vite
npm run dev
```

### Common Issues

**Issue:** Tailwind classes not applying  
**Fix:** Ensure file is included in `tailwind.config.js` content array

**Issue:** Component not rendering  
**Fix:** Check imports, ensure export/import names match

**Issue:** Firebase errors  
**Fix:** Check `.env` file for API credentials, verify Firebase rules

---

## 📞 Getting Help

### Resources
- [React Docs](https://react.dev/)
- [TailwindCSS Docs](https://tailwindcss.com/docs)
- [Vite Docs](https://vite.dev/)
- [Lucide Icons](https://lucide.dev/)
- [Firebase Docs](https://firebase.google.com/docs)

### Project-Specific Questions
- Check existing components for patterns
- Review `App.jsx` for state management
- Check `src/constants/data.js` for app-wide constants

---

## 🎯 Next Steps for UI Development

### Immediate Tasks (Quick Wins)
1. ✅ Extract common components (Button, Card, Input)
2. ✅ Standardize spacing and colors
3. ✅ Add loading states to async operations
4. ✅ Improve mobile responsiveness
5. ✅ Add hover effects and transitions

### Medium-term Tasks
1. Implement dark mode
2. Add toast notification system
3. Create component storybook/demo page
4. Improve accessibility (ARIA labels, keyboard nav)
5. Add error boundaries

### Long-term Tasks
1. Design system documentation
2. Component library with variants
3. Animation system
4. Performance optimization (code splitting)
5. E2E testing setup

---

## 📝 Handoff Checklist

Before starting development, ensure you have:

- [ ] Project running locally (`npm run dev`)
- [ ] Firebase credentials configured (if needed)
- [ ] Access to design mockups (if available)
- [ ] Understanding of component architecture
- [ ] TailwindCSS basics knowledge
- [ ] Git workflow established
- [ ] Communication channel with backend team

---

**Happy Coding! 🚀**

If you have any questions, feel free to explore the codebase or reach out to the team.
