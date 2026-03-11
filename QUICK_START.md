# 🚀 Frontend Developer Quick Start

> **TL;DR: Everything you need to start working on Evoluter's UI**

---

## ⚡ 60-Second Setup

```bash
# 1. Navigate to project
cd /Volumes/Genartml/Evoluter/evoluter-engine

# 2. Install dependencies
npm install

# 3. Run the app
npm run dev

# 4. Open browser → http://localhost:5173/

# 5. Login with demo credentials
Student Email: student@demo.evoluter.app
Password: 123345
```

**That's it! You're ready to code.** 🎉

---

## 📚 Documentation Index

### 1. [FRONTEND_DEV_GUIDE.md](./FRONTEND_DEV_GUIDE.md) - **START HERE**
**Complete developer guide** (500+ lines)
- Project overview & tech stack
- Architecture & file structure
- Styling guidelines (TailwindCSS)
- State management patterns
- UI improvement areas
- Best practices & common tasks

**Read this first for comprehensive understanding.**

---

### 2. [UI_COMPONENT_REFERENCE.md](./UI_COMPONENT_REFERENCE.md)
**Component documentation** (450+ lines)
- All 13 main views explained
- Dashboard components
- Test/quiz components
- Layout components (Sidebar, etc.)
- Common reusable components
- Props, usage patterns, and design guidelines

**Use this as your component lookup reference.**

---

### 3. [FRONTEND_HANDOFF.md](./FRONTEND_HANDOFF.md)
**Step-by-step checklist** (300+ lines)
- Pre-development setup tasks
- Design system understanding
- Technical preparation
- First tasks to tackle (Quick Wins)
- Testing & QA checklist
- Code review preparation

**Follow this checklist systematically for onboarding.**

---

## 🎯 What to Work On?

### Priority 1: Quick Wins (Start Here) ✨
1. **Extract Button component** - Create reusable button variants
2. **Standardize Card component** - Consistent card styling
3. **Mobile sidebar improvement** - Add hamburger menu
4. **Loading states** - Spinners for async operations
5. **Hover effects** - Polish interactive elements

### Priority 2: Medium-Term Goals 🌟
- Dark mode implementation
- Toast notification system
- Typography consistency
- Micro-animations (Framer Motion)
- Accessibility improvements

### Priority 3: Advanced Features 🚀
- PWA support
- Performance optimization
- Component storybook
- E2E testing
- Image optimization

---

## 🏗️ Project Structure (Quick Reference)

```
evoluter-engine/
├── src/
│   ├── App.jsx              # Main app logic (320 lines)
│   ├── components/
│   │   ├── views/           # 13 main views (Dashboard, Test, etc.)
│   │   ├── dashboard/       # Dashboard-specific components
│   │   ├── test/            # Test/quiz components
│   │   ├── layout/          # Sidebar, navigation
│   │   └── common/          # Reusable UI (Button, Card, etc.)
│   ├── hooks/               # useAuth, useTest
│   ├── services/            # Firebase, Gemini AI
│   ├── constants/           # App data & configs
│   └── utils/               # Helper functions
├── public/                  # Static assets
└── [documentation files]    # You are here!
```

---

## 🎨 Design System Overview

### Colors
- **Primary:** `blue-600` (CTAs, links)
- **Background:** `slate-50` (main), `white` (cards)
- **Text:** `slate-900` (primary), `slate-600` (secondary)
- **Success:** `emerald-500` | **Error:** `red-500`

### Typography
- **Font:** Inter (Google Fonts)
- **Sizes:** `text-sm` (14px) → `text-2xl` (24px)

### Spacing
- **Cards:** `p-6 lg:p-8`
- **Sections:** `mb-6 lg:mb-8`
- **Grids:** `gap-4 lg:gap-6`

### Responsive Breakpoints
- `sm: 640px` → Mobile landscape
- `md: 768px` → Tablets
- `lg: 1024px` → Desktop

---

## 🔧 Common Commands

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run preview   # Preview production
npm run lint      # Run ESLint
```

---

## 📞 Need Help?

### Documentation
1. **FRONTEND_DEV_GUIDE.md** - Comprehensive guide
2. **UI_COMPONENT_REFERENCE.md** - Component details
3. **FRONTEND_HANDOFF.md** - Onboarding checklist
4. **README.md** - Project overview

### Code Examples
- Look at existing components in `src/components/`
- Check `App.jsx` for state management patterns
- Review `src/index.css` for custom styles

### External Resources
- [React Docs](https://react.dev/)
- [TailwindCSS Docs](https://tailwindcss.com/docs)
- [Lucide Icons](https://lucide.dev/)

---

## ✅ First Day Checklist

- [ ] Run `npm run dev` successfully
- [ ] Login with demo credentials
- [ ] Navigate through all 12 views
- [ ] Read FRONTEND_DEV_GUIDE.md
- [ ] Skim UI_COMPONENT_REFERENCE.md
- [ ] Pick first task from Quick Wins
- [ ] Create feature branch: `git checkout -b feature/your-task`
- [ ] Make your first change!

---

## 🎉 You're All Set!

**Three steps to get started:**

1. **Read:** [FRONTEND_DEV_GUIDE.md](./FRONTEND_DEV_GUIDE.md) (30 min)
2. **Explore:** Run the app, click around, understand the UI
3. **Code:** Start with a Quick Win task (Button component)

**Happy coding! 🚀**

---

*Last updated: February 11, 2026*
