# 🎨 Frontend Issues - Remaining Work

**Report Date:** 2026-02-12  
**Category:** Frontend, UI/UX, React Components  
**Total Issues:** 16  
**Total Effort:** 195 hours (~5 weeks for 1 frontend engineer)

---

## 📊 **SUMMARY**

| Priority | Count | Hours |
|----------|-------|-------|
| 🟠 High | 6 | 92h |
| 🟡 Medium | 7 | 80h |
| 🔵 Low | 3 | 23h |
| **TOTAL** | **16** | **195h** |

---

## 🟠 **HIGH PRIORITY FRONTEND ISSUES**

---

### **🔵 F-2: Syllabus Tracking — Static Data Only**

**Status:** ✅ **RESOLVED**
**Effort:** 2 hours
**Type:** Frontend Logic

**Resolution:**
- Updated `SyllabusView.jsx` to fetch real-time progress from Firestore (`users/{uid}/syllabus/progress`).
- Replaced static random data with a clean initialization state (0% by default).
- Implemented `useAuth` hook for consistent user session handling.
- Firestore listeners now merge real data with static syllabus structure dynamically.

**Issue:**
- `SYLLABUS_DATA` is hardcoded static JSON in `constants/data.js`
- Progress bars never change
- No correlation between test completion and syllabus updates

**Frontend Work Required:**

1. **Create Syllabus State Management:**
```javascript
// hooks/useSyllabus.js
export const useSyllabus = () => {
  const [syllabusProgress, setSyllabusProgress] = useState({});
  
  const updateProgress = (topic, score, total) => {
    setSyllabusProgress(prev => ({
      ...prev,
      [topic]: {
        completed: (prev[topic]?.completed || 0) + score,
        total: (prev[topic]?.total || 0) + total,
        percentage: calculatePercentage(score, total)
      }
    }));
  };
  
  return { syllabusProgress, updateProgress };
};
```

2. **Update SyllabusView.jsx:**
```javascript
// Replace static data with dynamic Firestore data
const [syllabusData, setSyllabusData] = useState([]);

useEffect(() => {
  // Fetch from Firestore instead of using SYLLABUS_DATA constant
  const fetchSyllabus = async () => {
    const doc = await getDoc(doc(db, `users/${userId}/syllabus/progress`));
    setSyllabusData(doc.data());
  };
  fetchSyllabus();
}, [userId]);
```

3. **Connect to Test Results:**
```javascript
// In ResultView.jsx - After test completion
const updateSyllabusAfterTest = async (testResult) => {
  const topicMapping = {
    'Polity': 'constitution_polity',
    'History': 'indian_history',
    // ... map test topics to syllabus topics
  };
  
  const syllabusSection = topicMapping[testResult.topic];
  
  await updateDoc(doc(db, `users/${userId}/syllabus/${syllabusSection}`), {
    questionsAnswered: increment(testResult.totalQuestions),
    correctAnswers: increment(testResult.score),
    lastUpdated: serverTimestamp()
  });
};
```

**Files to Modify:**
- `src/components/views/SyllabusView.jsx`
- `src/components/views/ResultView.jsx`
- `src/hooks/useSyllabus.js` (create new)
- `src/constants/data.js` (topic mapping)

**Dependencies:** Firestore setup

---

### **🔵 F-3: News "Save" and "Bookmark" Buttons — Non-Functional**

**Status:** ✅ **RESOLVED**
**Effort:** 2 hours
**Type:** Frontend Feature

**Resolution:**
- Implemented `handleSaveArticle` function in `NewsView.jsx`.
- Added state management for `savedArticles` (Set) and `savingArticle` (loading state).
- Integrated Firestore `users/{uid}/saved_articles` collection for persistence.
- Added visual feedback (toggle icon/text) and error handling.
- Button now correctly saves/unsaves articles with database synchronization.

**Issue:**
- Buttons have **no onClick handler**
- No saved state management
- No saved articles view

**Frontend Work Required:**

1. **Add State Management:**
```javascript
// In NewsView.jsx
const [savedArticles, setSavedArticles] = useState([]);
const [isSaving, setIsSaving] = useState({});

const handleSaveArticle = async (article) => {
  setIsSaving(prev => ({ ...prev, [article.id]: true }));
  
  try {
    // Check if already saved
    if (savedArticles.includes(article.id)) {
      // Unsave
      await deleteDoc(doc(db, `users/${userId}/saved_articles/${article.id}`));
      setSavedArticles(prev => prev.filter(id => id !== article.id));
    } else {
      // Save
      await setDoc(doc(db, `users/${userId}/saved_articles/${article.id}`), {
        ...article,
        savedAt: serverTimestamp()
      });
      setSavedArticles(prev => [...prev, article.id]);
    }
  } catch (error) {
    handleError(error, 'Failed to save article', ErrorSeverity.USER_FACING);
  } finally {
    setIsSaving(prev => ({ ...prev, [article.id]: false }));
  }
};
```

2. **Update Button UI:**
```javascript
<button 
  onClick={() => handleSaveArticle(article)}
  disabled={isSaving[article.id]}
  className={`... ${savedArticles.includes(article.id) ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
>
  <Bookmark 
    size={14} 
    fill={savedArticles.includes(article.id) ? 'currentColor' : 'none'}
  />
  {savedArticles.includes(article.id) ? 'Saved' : 'Save'}
</button>
```

3. **Create Saved Articles View:**
```javascript
// components/views/SavedArticlesView.jsx
const SavedArticlesView = () => {
  const [savedArticles, setSavedArticles] = useState([]);
  
  useEffect(() => {
    const fetchSaved = async () => {
      const snapshot = await getDocs(
        collection(db, `users/${userId}/saved_articles`)
      );
      setSavedArticles(snapshot.docs.map(doc => doc.data()));
    };
    fetchSaved();
  }, []);
  
  return (
    <div>
      <h2>Saved Articles</h2>
      {savedArticles.map(article => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
};
```

**Files to Modify:**
- `src/components/views/NewsView.jsx`
- `src/components/views/SavedArticlesView.jsx` (create new)
- `src/App.jsx` (add route)

**Dependencies:** Firestore setup

---

### **🔵 F-4: Knowledge Graph — No Real Calculation**

**Status:** ✅ **RESOLVED**
**Effort:** 1 hour
**Type:** Frontend Logic

**Resolution:**
- Verified `userService.js` correctly calculates weighted mastery updates.
- Updated `App.jsx` to call `refreshUser()` immediately upon exiting a test.
- This ensures the `Dashboard` reflects the new mastery levels instantly without a page reload.
- The `KnowledgeGraph` component now displays real-time data driven by test performance.

**Issue:**
- `topicMastery` initializes to all zeros in `DEFAULT_USER_STATS`
- Never updates after test completion
- Graph shows 0% forever

**Frontend Work Required:**

1. **Update userService.js:**
```javascript
// In updateUserStats function
export const updateUserStats = async (userId, testResult) => {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  const currentStats = userDoc.data()?.stats || DEFAULT_USER_STATS;
  
  // Calculate topic mastery
  const topic = testResult.topic;
  const accuracy = testResult.score / testResult.totalQuestions;
  const previousMastery = currentStats.topicMastery?.[topic] || 0;
  
  // Weighted average (70% previous, 30% new)
  const newMastery = previousMastery * 0.7 + accuracy * 0.3;
  
  await updateDoc(userRef, {
    'stats.totalQuestionsSolved': increment(testResult.totalQuestions),
    'stats.xp': increment(testResult.xpEarned),
    [`stats.topicMastery.${topic}`]: newMastery, // ✅ NEW
    'stats.updatedAt': serverTimestamp()
  });
};
```

2. **Update ResultView.jsx:**
```javascript
// After test submission
const handleTestComplete = async () => {
  const testResult = {
    topic: testConfig.topic,
    score: finalScore,
    totalQuestions: questions.length,
    xpEarned: calculateXP(finalScore)
  };
  
  // Update stats including topic mastery
  await updateUserStats(user.uid, testResult);
  
  // Refresh user data to show updated graph
  await refreshUser();
};
```

3. **Enhance KnowledgeGraph Component:**
```javascript
// components/common/KnowledgeGraph.jsx
const KnowledgeGraph = ({ mastery }) => {
  // Add animations when mastery changes
  const [animatedMastery, setAnimatedMastery] = useState(mastery);
  
  useEffect(() => {
    // Animate from old to new values
    const timer = setTimeout(() => {
      setAnimatedMastery(mastery);
    }, 300);
    return () => clearTimeout(timer);
  }, [mastery]);
  
  return (
    // Render with animatedMastery
  );
};
```

**Files to Modify:**
- `src/services/userService.js`
- `src/components/views/ResultView.jsx`
- `src/components/common/KnowledgeGraph.jsx`
- `src/hooks/useAuth.js` (ensure refreshUser works)

**Dependencies:** None

---

### **🟠 MF-1: No Password Reset Flow**

**Status:** ⚠️ **NOT IMPLEMENTED**  
**Effort:** 4 hours  
**Type:** Frontend Feature

**Issue:**
- No "Forgot Password?" link in LoginView
- Users locked out if they forget password

**Frontend Work Required:**

1. **Add to LoginView.jsx:**
```javascript
import { sendPasswordResetEmail } from 'firebase/auth';

const [showResetModal, setShowResetModal] = useState(false);
const [resetEmail, setResetEmail] = useState('');
const [resetSent, setResetSent] = useState(false);

const handlePasswordReset = async (e) => {
  e.preventDefault();
  
  try {
    await sendPasswordResetEmail(auth, resetEmail);
    setResetSent(true);
    logger.info('Password reset email sent', { email: resetEmail });
  } catch (error) {
    handleError(
      error,
      'Failed to send reset email. Please check the email address.',
      ErrorSeverity.USER_FACING,
      ErrorCategory.AUTH
    );
  }
};
```

2. **Add UI Components:**
```javascript
// Forgot Password Link
<div className="text-center mt-4">
  <button
    type="button"
    onClick={() => setShowResetModal(true)}
    className="text-sm text-[#2278B0] hover:underline"
  >
    Forgot Password?
  </button>
</div>

// Reset Password Modal
{showResetModal && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-2xl p-8 max-w-md w-full">
      <h3 className="text-2xl font-bold mb-4">Reset Password</h3>
      
      {!resetSent ? (
        <form onSubmit={handlePasswordReset}>
          <input
            type="email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            placeholder="Enter your email"
            className="w-full border rounded-xl p-3 mb-4"
            required
          />
          <button type="submit" className="w-full bg-[#2278B0] text-white py-3 rounded-xl">
            Send Reset Link
          </button>
        </form>
      ) : (
        <div className="text-center">
          <p className="text-green-600 mb-4">
            ✅ Password reset email sent! Check your inbox.
          </p>
          <button onClick={() => setShowResetModal(false)}>Close</button>
        </div>
      )}
      
      <button
        onClick={() => {
          setShowResetModal(false);
          setResetSent(false);
        }}
        className="mt-4 text-gray-500"
      >
        Cancel
      </button>
    </div>
  </div>
)}
```

**Files to Modify:**
- `src/components/views/LoginView.jsx`

**Dependencies:** Firebase Auth

---

### **🔵 MF-1: Dashboard "Continue Learning" Data**
**Status:** ✅ **RESOLVED**
**Issue:** Hardcoded to "Polity - Constitution".
**Resolution:** Updated `Dashboard.jsx` to dynamically calculate days remaining until the target exam based on `userData.targetYear` (defaulting to current year/UPSC date).

### **🔵 MF-2: Library "Search"**
**Status:** ✅ **RESOLVED**
**Issue:** UI exists but `handleSearch` empty.
**Resolution:** Implemented full search functionality in `LibraryView.jsx` including:
- Search input field above tabs.
- Filter logic for Title, Category, and Tags.
- Real-time filtering of the document grid.

---

### **🟠 MF-2: No Test History/Review Page**

**Status:** ⚠️ **NOT IMPLEMENTED**  
**Effort:** 16 hours  
**Type:** Frontend Feature

**Issue:**
- Tests saved to Firestore but no UI to view past tests
- Users can't review past performance or learn from mistakes

**Frontend Work Required:**

1. **Create TestHistoryView.jsx:**
```javascript
// components/views/TestHistoryView.jsx
const TestHistoryView = () => {
  const { user } = useAuth();
  const [testHistory, setTestHistory] = useState([]);
  const [filter, setFilter] = useState({ topic: 'all', sortBy: 'date' });
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      const testsRef = collection(db, `users/${user.uid}/tests`);
      const q = query(testsRef, orderBy('completedAt', 'desc'));
      const snapshot = await getDocs(q);
      
      setTestHistory(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
      setLoading(false);
    };
    
    fetchHistory();
  }, [user.uid]);
  
  const filteredTests = testHistory.filter(test => 
    filter.topic === 'all' || test.topic === filter.topic
  );
  
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Test History</h1>
      
      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <select 
          value={filter.topic}
          onChange={(e) => setFilter({ ...filter, topic: e.target.value })}
          className="border rounded-xl p-2"
        >
          <option value="all">All Topics</option>
          <option value="Polity">Polity</option>
          <option value="History">History</option>
          {/* ... more topics */}
        </select>
      </div>
      
      {/* Test Cards */}
      <div className="grid gap-4">
        {filteredTests.map(test => (
          <TestHistoryCard key={test.id} test={test} />
        ))}
      </div>
    </div>
  );
};
```

2. **Create TestHistoryCard Component:**
```javascript
const TestHistoryCard = ({ test }) => {
  const navigate = useNavigate();
  
  return (
    <div className="border rounded-xl p-6 hover:shadow-lg transition">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-bold">{test.topic}</h3>
          <p className="text-gray-600">
            {format(test.completedAt.toDate(), 'MMM dd, yyyy - HH:mm')}
          </p>
        </div>
        
        <div className="text-right">
          <p className="text-3xl font-bold text-[#2278B0]">
            {test.score}/{test.totalQuestions}
          </p>
          <p className="text-sm text-gray-600">
            {Math.round((test.score / test.totalQuestions) * 100)}%
          </p>
        </div>
      </div>
      
      <div className="mt-4 flex gap-2">
        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
          {test.difficulty}
        </span>
        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
          +{test.xpEarned} XP
        </span>
      </div>
      
      <button
        onClick={() => navigate(`/test/review/${test.id}`)}
        className="mt-4 text-[#2278B0] hover:underline"
      >
        Review Answers →
      </button>
    </div>
  );
};
```

3. **Create TestReviewView.jsx:**
```javascript
// For reviewing individual test
const TestReviewView = () => {
  const { testId } = useParams();
  const [testData, setTestData] = useState(null);
  
  useEffect(() => {
    const fetchTest = async () => {
      const doc = await getDoc(doc(db, `users/${userId}/tests/${testId}`));
      setTestData(doc.data());
    };
    fetchTest();
  }, [testId]);
  
  return (
    <div>
      {/* Show questions with:
          - User's answer
          - Correct answer
          - Explanation
      */}
    </div>
  );
};
```

**Files to Create:**
- `src/components/views/TestHistoryView.jsx`
- `src/components/views/TestReviewView.jsx`
- `src/components/test/TestHistoryCard.jsx`

**Files to Modify:**
- `src/App.jsx` (add routes)
- `src/components/layout/Sidebar.jsx` (add "History" link)

**Dependencies:** None

---

### **🟠 ARCH-2: Monolithic App.jsx**

**Status:** ⚠️ **NOT REFACTORED**  
**Effort:** 24 hours  
**Type:** Architecture Refactoring

**Issue:**
- App.jsx is 561 lines
- Manages routing, auth, tests, documents, mains evaluation, navigation
- Violates Single Responsibility Principle

**Frontend Work Required:**

1. **Create Context Files:**

```javascript
// contexts/AuthContext.jsx
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const {
    user,
    userData,
    isAuthenticated,
    handleGoogleLogin,
    handleEmailLogin,
    handleEmailSignup,
    handleLogout,
    authLoading,
    loginError,
    refreshUser
  } = useAuth();
  
  return (
    <AuthContext.Provider value={{
      user,
      userData,
      isAuthenticated,
      handleGoogleLogin,
      handleEmailLogin,
      handleEmailSignup,
      handleLogout,
      authLoading,
      loginError,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => useContext(AuthContext);
```

```javascript
// contexts/TestContext.jsx
export const TestContext = createContext();

export const TestProvider = ({ children }) => {
  const {
    activeTest,
    answers,
    markedForReview,
    testConfig,
    currentIndex,
    startAITest,
    startMockTest,
    handleAnswer,
    submitTest
  } = useTest();
  
  return (
    <TestContext.Provider value={{
      activeTest,
      answers,
      markedForReview,
      testConfig,
      currentIndex,
      startAITest,
      startMockTest,
      handleAnswer,
      submitTest
    }}>
      {children}
    </TestContext.Provider>
  );
};
```

```javascript
// contexts/LibraryContext.jsx
export const LibraryContext = createContext();

export const LibraryProvider = ({ children }) => {
  const [docs, setDocs] = useState([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  
  const handleFileUpload = async (file) => {
    // ... upload logic
  };
  
  const handleDeleteDoc = async (docId) => {
    // ... delete logic
  };
  
  return (
    <LibraryContext.Provider value={{
      docs,
      uploadingDoc,
      handleFileUpload,
      handleDeleteDoc
    }}>
      {children}
    </LibraryContext.Provider>
  );
};
```

2. **Create Routes File:**

```javascript
// config/routes.jsx
import { ROUTES } from '../constants/routes';

export const AppRoutes = () => {
  const { isAuthenticated, userData } = useAuthContext();
  
  return (
    <Routes>
      {/* Public Routes */}
      <Route path={ROUTES.HOME} element={<HomeView />} />
      <Route path={ROUTES.LOGIN} element={
        isAuthenticated ? <Navigate to={ROUTES.DASHBOARD} /> : <LoginView />
      } />
      
      {/* Protected Routes */}
      <Route element={<ProtectedLayout />}>
        <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
        <Route path={ROUTES.TEST} element={<TestView />} />
        {/* ... more routes */}
      </Route>
    </Routes>
  );
};
```

3. **Refactor App.jsx:**

```javascript
// Simplified App.jsx (< 100 lines)
function App() {
  return (
    <AuthProvider>
      <TestProvider>
        <LibraryProvider>
          <GlobalStyles />
          <Suspense fallback={<LoadingFallback />}>
            <AppRoutes />
          </Suspense>
        </LibraryProvider>
      </TestProvider>
    </AuthProvider>
  );
}
```

**Files to Create:**
- `src/contexts/AuthContext.jsx`
- `src/contexts/TestContext.jsx`
- `src/contexts/LibraryContext.jsx`
- `src/config/routes.jsx`

**Files to Modify:**
- `src/App.jsx` (simplify dramatically)
- All components using props (switch to context)

**Dependencies:** None

---

## 🟡 **MEDIUM PRIORITY FRONTEND ISSUES**

---

### **🟡 MF-4: No Export/Download Test Results**

**Status:** ⚠️ **NOT IMPLEMENTED**  
**Effort:** 8 hours  
**Type:** Frontend Feature

**Frontend Work Required:**

```javascript
// In ResultView.jsx
import jsPDF from 'jspdf';

const exportToPDF = () => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text('Test Performance Report', 20, 20);
  
  // Test Details
  doc.setFontSize(12);
  doc.text(`Topic: ${testResult.topic}`, 20, 35);
  doc.text(`Date: ${format(testResult.date, 'MMM dd, yyyy')}`, 20, 45);
  doc.text(`Score: ${testResult.score}/${testResult.totalQuestions}`, 20, 55);
  doc.text(`Accuracy: ${testResult.accuracy}%`, 20, 65);
  doc.text(`Time Taken: ${testResult.timeTaken}`, 20, 75);
  
  // Question-by-question breakdown
  let yPos = 95;
  testResult.questions.forEach((q, idx) => {
    doc.text(`Q${idx + 1}: ${q.isCorrect ? '✓' : '✗'}`, 20, yPos);
    yPos += 10;
    
    if (yPos > 280) { // New page if needed
      doc.addPage();
      yPos = 20;
    }
  });
  
  doc.save(`test-report-${testResult.id}.pdf`);
};

// UI Button
<button onClick={exportToPDF} className="...">
  <Download size={18} />
  Download Report
</button>
```

**Dependencies:** jsPDF library

---

### **🟡 MF-5: No Search in Library**

**Status:** ⚠️ **NOT IMPLEMENTED**  
**Effort:** 4 hours  
**Type:** Frontend Feature

**Frontend Work Required:**

```javascript
// In LibraryView.jsx
const [searchQuery, setSearchQuery] = useState('');
const [filterTag, setFilterTag] = useState('all');

const filteredDocs = docs.filter(doc => {
  const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
  
  const matchesFilter = filterTag === 'all' || doc.tags?.includes(filterTag);
  
  return matchesSearch && matchesFilter;
});

// UI
<div className="mb-6 flex gap-4">
  <input
    type="text"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    placeholder="Search by title or tags..."
    className="flex-1 border rounded-xl p-3"
  />
  <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)}>
    <option value="all">All Tags</option>
    <option value="ncert">NCERT</option>
    <option value="current-affairs">Current Affairs</option>
    {/* More tags */}
  </select>
</div>

{filteredDocs.map(doc => <DocumentCard key={doc.id} doc={doc} />)}
```

**Dependencies:** None

---

### **🟡 MF-6: No "About Us" / "Contact" Pages**

**Status:** ⚠️ **NOT IMPLEMENTED**  
**Effort:** 8 hours  
**Type:** Frontend Pages

**Frontend Work Required:**

Create new pages:

1. **AboutView.jsx** - Team, vision, mission
2. **ContactView.jsx** - Contact form with Firestore submission
3. **PrivacyView.jsx** - Privacy policy
4. **TermsView.jsx** - Terms of service

```javascript
// components/views/ContactView.jsx
const ContactView = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    await addDoc(collection(db, 'contact_submissions'), {
      ...formData,
      submittedAt: serverTimestamp(),
      status: 'new'
    });
    
    setSubmitted(true);
  };
  
  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1>Contact Us</h1>
      {!submitted ? (
        <form onSubmit={handleSubmit}>
          {/* Form fields */}
        </form>
      ) : (
        <div>Thank you! We'll get back to you soon.</div>
      )}
    </div>
  );
};
```

**Files to Create:**
- `src/components/views/AboutView.jsx`
- `src/components/views/ContactView.jsx`
- `src/components/views/PrivacyView.jsx`
- `src/components/views/TermsView.jsx`

**Dependencies:** None

---

### **🟡 ARCH-3: No Error Boundaries at Route Level**

**Status:** ⚠️ **NOT IMPLEMENTED**  
**Effort:** 8 hours  
**Type:** Architecture

**Frontend Work Required:**

```javascript
// components/error/RouteErrorBoundary.jsx
class RouteErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    logger.error('Route error caught', { error, errorInfo });
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || <DefaultErrorPage error={this.state.error} />;
    }
    return this.props.children;
  }
}

// In routes
<Route path={ROUTES.DASHBOARD} element={
  <RouteErrorBoundary fallback={<DashboardError />}>
    <Dashboard />
  </RouteErrorBoundary>
} />
```

**Files to Create:**
- `src/components/error/RouteErrorBoundary.jsx`
- `src/components/error/DashboardError.jsx`
- `src/components/error/TestError.jsx`

**Dependencies:** None

---

### **🟡 ARCH-4: Missing Redux/Zustand for Global State**

**Status:** ⚠️ **NOT IMPLEMENTED**  
**Effort:** 16 hours  
**Type:** Architecture

**Frontend Work Required:**

```javascript
// stores/testStore.js
import create from 'zustand';

export const useTestStore = create((set) => ({
  activeTest: null,
  answers: {},
  markedForReview: [],
  currentIndex: 0,
  
  setActiveTest: (test) => set({ activeTest: test }),
  setAnswer: (questionId, answer) => set(state => ({
    answers: { ...state.answers, [questionId]: answer }
  })),
  toggleMarkForReview: (questionId) => set(state => ({
    markedForReview: state.markedForReview.includes(questionId)
      ? state.markedForReview.filter(id => id !== questionId)
      : [...state.markedForReview, questionId]
  })),
  setCurrentIndex: (index) => set({ currentIndex: index }),
  reset: () => set({
    activeTest: null,
    answers: {},
    markedForReview: [],
    currentIndex: 0
  })
}));
```

**Files to Create:**
- `src/stores/testStore.js`
- `src/stores/userStore.js`
- `src/stores/uiStore.js`

**Files to Modify:**
- Replace props drilling with store usage

**Dependencies:** Zustand library

---

### **🟡 Migration: Use New Utilities**

**Status:** ⚠️ **NOT MIGRATED**  
**Effort:** 16 hours  
**Type:** Code Quality

**Frontend Work Required:**

1. **Replace navigate() calls (50 instances):**
```bash
# Find all instances
grep -r "navigate('/" src/

# Replace with ROUTES constants
navigate('/dashboard') → navigate(ROUTES.DASHBOARD)
navigate('/test') → navigate(ROUTES.TEST)
```

2. **Replace console.log (30 instances):**
```bash
console.log → logger.info
console.error → logger.error
console.warn → logger.warn
```

3. **Replace try-catch blocks (25 instances):**
```javascript
// Before
try {
  await operation();
} catch (error) {
  console.error(error);
  alert('Failed');
}

// After
try {
  await operation();
} catch (error) {
  handleError(error, 'Operation failed', ErrorSeverity.USER_FACING);
}
```

4. **Apply naming conventions:**
- Rename props: `handleX` → `onX` for callbacks
- Rename internal handlers: `onX` → `handleX`

**Files to Update:** ~40 component files

**Dependencies:** None

---

## 🔵 **LOW PRIORITY FRONTEND ISSUES**

---

### **🔵 REF-4: Split HomeView.jsx**

**Status:** 📋 **DOCUMENTED**  
**Effort:** 16 hours

**Extract into components:**
- `HeroSection.jsx`
- `FeaturesSection.jsx`
- `AboutSection.jsx`
- `HowItWorksSection.jsx`
- `AnalyticsPreviewSection.jsx`
- `TestimonialsSection.jsx`
- `FAQSection.jsx`
- `Footer.jsx`

---

### **🔵 PERF-5: Animation Optimization**

**Status:** 📋 **DOCUMENTED**  
**Effort:** 4 hours

- Add `will-change: transform` to animated elements
- Reduce stagger delay from 0.1s to 0.05s
- Use `transform` and `opacity` only

---

### **🔵 CLEAN-2: Remove Commented Code**

**Status:** 📋 **DOCUMENTED**  
**Effort:** 1 hour

- Remove commented code from `TestView.jsx` (Lines 42-45)
- Review all `//@` comments

---

## 📊 **SPRINT PLAN FOR FRONTEND**

### **Frontend Sprint 1 (Week 1) - Core Features**
**Hours:** 44

- [ ] F-3: News bookmarks (8h)
- [ ] F-4: Knowledge graph updates (12h)
- [ ] MF-1: Password reset (4h)
- [ ] MF-5: Library search (4h)
- [ ] MF-4: Export PDF (8h)
- [ ] MF-6: About/Contact pages (8h)

---

### **Frontend Sprint 2 (Week 2) - Syllabus & History**
**Hours:** 32

- [ ] F-2: Syllabus tracking (16h)
- [ ] MF-2: Test history page (16h)

---

### **Frontend Sprint 3 (Week 3) - Architecture**
**Hours:** 48

- [ ] ARCH-2: Refactor App.jsx (24h)
- [ ] ARCH-3: Error boundaries (8h)
- [ ] ARCH-4: State management (16h)

---

### **Frontend Sprint 4 (Week 4) - Polish**
**Hours:** 37

- [ ] Migration: Routes, logger, errors (16h)
- [ ] REF-4: Split HomeView (16h)
- [ ] PERF-5: Animations (4h)
- [ ] CLEAN-2: Remove comments (1h)

---

## ✅ **SUMMARY**

**Total Frontend Issues:** 16  
**Total Effort:** 195 hours  
**Timeline:** 5 weeks for 1 frontend engineer  
**Completion:** 0/16 (0%)

**Priority Distribution:**
- 🟠 High: 6 issues (92h)
- 🟡 Medium: 7 issues (80h)
- 🔵 Low: 3 issues (23h)

**Next Steps:**
1. Start with high-priority features (F-2, F-3, F-4, MF-1, MF-2)
2. Then architecture refactoring (ARCH-2, ARCH-3, ARCH-4)
3. Finally polish and migration

---

**Status:** ✅ **Frontend issues documented - Ready for development**
