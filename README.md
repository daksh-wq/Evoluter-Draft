<p align="center">
  <img src="https://img.shields.io/badge/⚡-Evoluter-blue?style=for-the-badge&logoColor=white" alt="Evoluter Logo"/>
</p>

<h1 align="center">Evoluter - Intelligent Exam Ecosystem</h1>

<p align="center">
  <strong>AI-Powered MCQ Practice & Exam Preparation Platform for UPSC & Competitive Exams</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react" alt="React"/>
  <img src="https://img.shields.io/badge/Vite-7.2-646CFF?style=flat-square&logo=vite" alt="Vite"/>
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?style=flat-square&logo=tailwindcss" alt="TailwindCSS"/>
  <img src="https://img.shields.io/badge/Gemini_AI-Powered-4285F4?style=flat-square&logo=google" alt="Gemini AI"/>
</p>

---

## 📋 Overview

**Evoluter** is a comprehensive exam preparation platform designed specifically for **UPSC Civil Services** and other competitive examinations. It combines AI-powered question generation with intelligent analytics to provide a personalized learning experience.

### 🎯 Target Exams
- UPSC Civil Services Examination (CSE)
- State PSC Examinations
- SSC, Banking & Other Government Exams

---

## ✨ Key Features

### 🧠 AI-Powered Question Generation
- **Custom Topic Drills**: Generate unique questions on any topic using Google Gemini AI
- **Dynamic Difficulty**: Questions adapt to cover Hard-level UPSC standard
- **Real-time Generation**: Get instant practice tests on topics like "Black Holes", "GST", etc.

### 📚 Resource Library
- **PDF Management**: Upload and organize study materials (NCERTs, Standard Books, Notes)
- **Smart Categorization**: Auto-categorize by Economy, Polity, History, Science, Geography
- **Question Extraction**: Extract MCQs directly from uploaded documents

### 📝 Mains AI Evaluator
- **Answer Analysis**: Get instant feedback on your written answers
- **Structural Evaluation**: AI analyzes introduction, body, and conclusion
- **Keyword Detection**: Identifies missing keywords and concepts
- **Score Prediction**: Provides score out of 10 with detailed feedback

### 📊 Knowledge Graph & Analytics
- **Visual Mastery Tracking**: Interactive knowledge graph showing topic-wise mastery
- **Weakness Spotlight**: Highlights areas needing improvement
- **Progress Metrics**: Track accuracy, questions solved, and streaks

### 📖 Syllabus Tracker
- **Complete UPSC Syllabus**: GS Paper 1, 2, 3, and 4 coverage
- **Progress Visualization**: Visual progress bars for each topic
- **Topic-wise Breakdown**: Detailed tracking of each syllabus component

### 📰 Current Affairs
- **AI-Curated News Feed**: Exam-relevant current affairs
- **Category Tags**: Environment, Polity, Science, Economy
- **Save & Share**: Bookmark important news for revision

### 🏆 Gamification
- **XP & Leveling System**: Earn experience points and level up
- **Daily Streaks**: Maintain consistency with streak tracking
- **Leaderboard**: Compete with peers on weekly rankings
- **Status Tiers**: Scholar → Expert → Master → Legend

### 🧘 Zen Mode
- **Distraction-Free Testing**: Full-screen immersive exam experience
- **Timed Tests**: Realistic exam simulation with countdown timer

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **React 19** | Frontend UI Framework |
| **Vite 7** | Build Tool & Dev Server |
| **TailwindCSS 3** | Utility-First CSS Styling |
| **Lucide React** | Modern Icon Library |
| **Google Gemini AI** | AI Question Generation & Evaluation |
| **LocalStorage** | Client-side Data Persistence |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Google Gemini API Key (optional, for AI features)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/evoluter.git

# Navigate to project directory
cd evoluter/evoluter-engine

# Install dependencies
npm install

# Start development server
npm run dev
```

### Configuration

To enable AI features, add your Gemini API key in `src/App.jsx`:

```javascript
// Line 29
const apiKey = "YOUR_GEMINI_API_KEY_HERE";
```

---

## 🔐 Demo Credentials

Use these credentials to access the platform:

| Field | Value |
|-------|-------|
| **Student ID** | `student` |
| **Password** | `123345` |

---

## 📁 Project Structure

```
evoluter-engine/
├── public/              # Static assets
├── src/
│   ├── App.jsx          # Main application (all views & logic)
│   ├── App.css          # Component styles
│   ├── main.jsx         # React entry point
│   ├── index.css        # Tailwind imports
│   └── assets/          # Images & icons
├── index.html           # HTML template
├── package.json         # Dependencies & scripts
├── tailwind.config.js   # Tailwind configuration
├── vite.config.js       # Vite configuration
└── README.md            # This file
```

---

## 📱 Application Views

| View | Description |
|------|-------------|
| **Dashboard** | Command center with stats, knowledge graph, and quick actions |
| **Library** | Manage uploaded PDFs and study materials |
| **Test** | MCQ practice with timer, review marking, and explanations |
| **Mains Evaluator** | AI-powered essay/answer writing evaluation |
| **Syllabus** | Track UPSC syllabus completion progress |
| **Current Affairs** | AI-curated news feed for exam preparation |
| **Leaderboard** | Weekly rankings and peer comparison |

---

## 🎨 UI Features

- **Modern Glassmorphism Design**
- **Smooth Animations** (fade-in, slide, zoom)
- **Responsive Layout** (Mobile, Tablet, Desktop)
- **Dark Theme Elements**
- **Interactive Knowledge Graph**
- **Progress Visualizations**

---

## 📊 Data Persistence

The application uses `localStorage` for persisting:
- User statistics (XP, level, streaks, mastery)
- Uploaded documents
- Authentication state

---

## 🔧 Available Scripts

```bash
# Development server with HMR
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Run ESLint
npm run lint
```

---

## 🗺️ Roadmap

- [ ] Backend API Integration
- [ ] User Authentication with OAuth
- [ ] Cloud Document Storage
- [ ] Previous Year Question Papers
- [ ] Mock Interview Module
- [ ] Mobile App (React Native)
- [ ] Offline Mode Support
- [ ] Multi-language Support

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 👨‍💻 Author

**Evoluter Team**

---

<p align="center">
  <strong>🎯 Aim High. Prepare Smart. Succeed with Evoluter.</strong>
</p>
