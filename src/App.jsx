import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { GlobalStyles } from './components/common';
import GlobalBanner from './components/common/GlobalBanner';
import { Sidebar } from './components/layout';
import AIAssistant from './components/common/AIAssistant';
import RouteErrorBoundary from './components/error/RouteErrorBoundary';

// Lazy load route components for code splitting
const LoginView = lazy(() => import('./components/views/LoginView'));
const Dashboard = lazy(() => import('./components/views/Dashboard'));
const LibraryView = lazy(() => import('./components/views/LibraryView'));
const PYQView = lazy(() => import('./components/views/PYQView'));
const SyllabusView = lazy(() => import('./components/views/SyllabusView'));
const NewsView = lazy(() => import('./components/views/NewsView'));
const LeaderboardView = lazy(() => import('./components/views/LeaderboardView'));
const TestView = lazy(() => import('./components/views/TestView'));
const OnboardingView = lazy(() => import('./components/views/OnboardingView'));
const ProfileView = lazy(() => import('./components/views/ProfileView'));
const ResultView = lazy(() => import('./components/views/ResultView'));
const HomeView = lazy(() => import('./components/views/HomeView'));
const FlashcardsView = lazy(() => import('./components/views/FlashcardsView'));
const TestHistoryView = lazy(() => import('./components/views/TestHistoryView'));
const TestReviewView = lazy(() => import('./components/views/TestReviewView'));
const AboutView = lazy(() => import('./components/views/AboutView'));
const ContactView = lazy(() => import('./components/views/ContactView'));
const PrivacyView = lazy(() => import('./components/views/PrivacyView'));
const TermsView = lazy(() => import('./components/views/TermsView'));
const AdminLayout = lazy(() => import('./components/admin/layout/AdminLayout'));
const AdminDashboard = lazy(() => import('./components/admin/views/DashboardOverview'));
const UserManagement = lazy(() => import('./components/admin/views/UserManagement'));
const AdminCMS = lazy(() => import('./components/admin/views/CMS'));
const AdminAnalytics = lazy(() => import('./components/admin/views/AnalyticsDashboard'));

import NetworkStatus from './components/ui/NetworkStatus';

import { useAuth, useTest } from './hooks';
import { DEFAULT_USER_STATS, NAV_ITEMS, INSTITUTION_NAV_ITEMS } from './constants/data';
import { ROUTES } from './constants/routes';
import { evaluateAnswer } from './services/geminiService';
import { RefreshCw, Menu } from 'lucide-react';
import logger from './utils/logger';
import { handleError, ErrorSeverity, ErrorCategory } from './utils/errorHandler';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  orderBy,
  serverTimestamp,
  onSnapshot,
  query
} from 'firebase/firestore';
import { db, storage } from './services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Institution Components (Lazy Load)
const InstitutionDashboard = lazy(() => import('./components/institution/InstitutionDashboard'));
const BatchManager = lazy(() => import('./components/institution/BatchManager'));
const TestCreator = lazy(() => import('./components/institution/TestCreator'));
const TestManager = lazy(() => import('./components/institution/TestManager'));
const StudentInstitutionView = lazy(() => import('./components/institution/StudentInstitutionView'));
const TestAnalytics = lazy(() => import('./components/institution/TestAnalytics'));
const StudentClassroom = lazy(() => import('./components/student/StudentClassroom'));

const ProtectedLayout = ({
  children,
  isAuthenticated,
  user,
  userData,
  authLoading,
  isZenMode,
  isSidebarOpen,
  setIsSidebarOpen,
  handleLogout,
  onOnboardingComplete
}) => {
  const location = useLocation();
  const isTestPage = location.pathname === '/test';
  const shouldHideNav = isZenMode || isTestPage;

  if (!isAuthenticated && !user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }
  if (isAuthenticated && !userData && !authLoading) {
    return <OnboardingView user={user} onComplete={onOnboardingComplete} />;
  }

  // Determine Nav Items based on Role
  const navItems = userData?.role === 'institution' ? INSTITUTION_NAV_ITEMS : NAV_ITEMS;

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-[#2278B0]/20 selection:text-indigo-950">
      <GlobalStyles />
      <GlobalBanner />
      {!shouldHideNav && (
        <>
          {/* Mobile Header */}
          <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Menu size={24} className="text-slate-700" />
              </button>
            </div>
          </div>

          <Sidebar
            onLogout={handleLogout}
            navItems={navItems}
            user={user}
            userData={userData}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />

          {/* Mobile Overlay */}
          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm animate-in fade-in"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
        </>
      )}

      <main className={`transition-all duration-300 ${shouldHideNav ? 'pl-0' : 'md:pl-20 lg:pl-64'}`}>
        <div className={`min-h-screen ${shouldHideNav ? '' : 'p-6 lg:p-10 max-w-7xl mx-auto'}`}>
          <RouteErrorBoundary>
            {children}
          </RouteErrorBoundary>
        </div>
      </main>

      {/* AI Assistant - Hidden on Test/Zen Mode */}
      {!shouldHideNav && (
        <AIAssistant userData={userData} userStats={userData?.stats} />
      )}
    </div>
  );
};

function App() {
  // --- Auth State ---
  const {
    user,
    userData,
    isAuthenticated,
    handleGoogleLogin,
    handleEmailLogin,
    handleEmailSignup,
    handleLogout: authLogout,
    authLoading,
    loginError,
    refreshUser,
  } = useAuth();

  // --- Router State ---
  const navigate = useNavigate();

  const [isZenMode, setIsZenMode] = useState(false);

  const exitZenMode = () => {
    if (isZenMode) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => logger.warn("Exit fullscreen failed", err));
      }
      setIsZenMode(false);
    }
  };

  const handleLogout = async () => {
    exitZenMode();
    await authLogout();
    navigate(ROUTES.LOGIN);
  };

  const userStats = userData?.stats || DEFAULT_USER_STATS;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // --- Test State ---
  const {
    activeTest,
    currentQuestionIndex,
    currentQuestion,
    answers,
    markedForReview,
    timeLeft,
    isGeneratingTest,
    setTimeLeft,
    startMockTest,
    startAITest,
    startInstitutionTest,
    startCustomTest,
    submitTest,
    exitTest,
    goToNextQuestion,
    goToPrevQuestion,
    goToQuestion,
    selectAnswer,
    toggleMarkForReview,
    generationProgress,
    isTestCompleted,
    testResults,
  } = useTest();

  // --- Feature States ---
  const [docs, setDocs] = useState([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // --- Effects ---

  // Fetch Docs when User ID available (Real-time)
  useEffect(() => {
    let unsubscribe = () => { };

    if (user?.uid) {
      try {
        const q = query(
          collection(db, 'users', user.uid, 'docs'),
          orderBy('uploadDate', 'desc')
        );
        unsubscribe = onSnapshot(q, (snapshot) => {
          const fetchedDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setDocs(fetchedDocs);
        }, (error) => {
          logger.error("Error fetching docs real-time:", error);
        });
      } catch (error) {
        logger.error("Error setting up doc listener:", error);
      }
    }
    return () => unsubscribe();
  }, [user]);

  // Timer Effect
  useEffect(() => {
    let interval;
    if (activeTest && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTest, timeLeft, setTimeLeft]);


  // --- Logic Handlers ---

  const handleStartPYQTest = (questions, title) => {
    startCustomTest(questions, title);
    navigate(ROUTES.TEST);
  };

  const handleFileUpload = async (file) => {
    if (!user) return;
    setUploadingDoc(true);

    try {
      const storageRef = ref(storage, `users/${user.uid}/docs/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      const newDocData = {
        title: file.name,
        type: file.name.split('.').pop().toUpperCase(),
        size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        uploadDate: serverTimestamp(),
        category: 'Uploads',
        tags: ['User', 'PDF'],
        url: downloadURL,
        storagePath: snapshot.metadata.fullPath,
        processed: true
      };

      const docRef = await addDoc(collection(db, 'users', user.uid, 'docs'), newDocData);
      const optimisticDoc = { id: docRef.id, ...newDocData, uploadDate: { toDate: () => new Date() } };
      setDocs(prev => [optimisticDoc, ...prev]);
      logger.info('Document uploaded', { docId: docRef.id });
    } catch (error) {
      handleError(error, 'Upload failed. Please try again.', ErrorSeverity.USER_FACING, ErrorCategory.STORAGE);
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!user || !confirm('Are you sure you want to delete this document?')) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'docs', docId));
      setDocs(prev => prev.filter(d => d.id !== docId));
      logger.info('Document deleted', { docId });
    } catch (error) {
      handleError(error, 'Failed to delete document.', ErrorSeverity.USER_FACING, ErrorCategory.DATABASE);
    }
  };

  const handleExtractQuestions = async (docItem) => {
    if (!docItem.url) {
      alert('PDF URL not available. Please re-upload the document.');
      return;
    }
    logger.info('Starting Extract Questions', { docTitle: docItem.title });
    // This function uses internal useTest setters which aren't exposed,
    // so it delegates to startAITest/startMockTest patterns via navigate
    navigate(ROUTES.DASHBOARD);
  };

  // Mains logic moved to MainsEvaluatorView.jsx
  const startMission = () => {
    startMockTest();
    navigate(ROUTES.TEST);
  };

  const handleGenerateAITest = async (topic, count, difficulty, resourceContent, pyqPercentage) => {
    await startAITest(topic, count, difficulty, userData?.targetExam || 'UPSC CSE', resourceContent, pyqPercentage);
    navigate(ROUTES.TEST);
  };

  const handleZenToggle = () => {
    if (!isZenMode) {
      document.documentElement.requestFullscreen().catch(logger.warn);
      setIsZenMode(true);
    } else {
      exitZenMode();
    }
  };

  const handleOnboardingComplete = (role) => {
    refreshUser();
    if (role === 'institution') {
      navigate('/institution/dashboard', { replace: true });
    } else {
      navigate(ROUTES.DASHBOARD, { replace: true });
    }
  };


  // --- Render ---

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <RefreshCw className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  const layoutProps = {
    isAuthenticated,
    user,
    userData,
    authLoading,
    isZenMode,
    isSidebarOpen,
    setIsSidebarOpen,
    handleLogout,
    onOnboardingComplete: handleOnboardingComplete
  };

  // Loading fallback for lazy-loaded components
  const LoadingFallback = () => (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="text-center">
        <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-600 font-medium">Loading...</p>
      </div>
    </div>
  );

  return (
    <Suspense fallback={<LoadingFallback />}>
      <NetworkStatus />
      <Routes>
        {/* Public Routes */}
        <Route path={ROUTES.HOME} element={
          <HomeView
            isAuthenticated={isAuthenticated}
            user={user}
            onLogout={handleLogout}
            onGetStarted={() => navigate(isAuthenticated ? ROUTES.DASHBOARD : ROUTES.LOGIN)}
          />
        } />

        <Route path={ROUTES.LOGIN} element={
          isAuthenticated ? <Navigate to={ROUTES.DASHBOARD} replace /> :
            <LoginView
              handleGoogleLogin={handleGoogleLogin}
              handleEmailLogin={handleEmailLogin}
              handleEmailSignup={handleEmailSignup}
              authLoading={authLoading}
              loginError={loginError}
            />
        } />

        {/* Public Pages */}
        <Route path={ROUTES.ABOUT} element={<AboutView />} />
        <Route path={ROUTES.CONTACT} element={<ContactView />} />
        <Route path={ROUTES.PRIVACY} element={<PrivacyView />} />
        <Route path={ROUTES.TERMS} element={<TermsView />} />

        {/* Protected Routes - Student */}
        <Route path={ROUTES.DASHBOARD} element={
          <ProtectedLayout {...layoutProps}>
            {userData?.role === 'institution' ? (
              <Navigate to="/institution/dashboard" replace />
            ) : (
              <Dashboard
                userData={userData}
                userStats={userStats}
                setView={(v) => navigate(`/${v}`)}
                generateAITest={handleGenerateAITest}
                isGeneratingTest={isGeneratingTest}
                generationProgress={generationProgress}
                startMission={startMission}
              />
            )}
          </ProtectedLayout>
        } />

        <Route path={ROUTES.TEST} element={
          <ProtectedLayout {...layoutProps}>
            {!activeTest ? <Navigate to={ROUTES.DASHBOARD} replace /> :
              (isTestCompleted ? (
                <ResultView
                  test={activeTest}
                  answers={answers}
                  results={testResults}
                  exitTest={async () => {
                    exitZenMode(); // FORCE RESET
                    await exitTest();
                    await refreshUser();
                    navigate(ROUTES.DASHBOARD);
                  }}
                />
              ) : (
                <TestView
                  test={activeTest}
                  currentIndex={currentQuestionIndex}
                  currentQuestion={currentQuestion}
                  answers={answers}
                  markedForReview={markedForReview}
                  timeLeft={timeLeft}
                  goToNext={goToNextQuestion}
                  goToPrev={goToPrevQuestion}
                  goToQuestion={goToQuestion}
                  selectAnswer={selectAnswer}
                  toggleMarkForReview={toggleMarkForReview}
                  endTest={submitTest}
                  isZenMode={isZenMode}
                  toggleZenMode={handleZenToggle}
                />
              ))}
          </ProtectedLayout>
        } />

        <Route path={ROUTES.LIBRARY} element={
          <ProtectedLayout {...layoutProps}>
            <LibraryView
              docs={docs}
              handleFileUpload={handleFileUpload}
              uploadingDoc={uploadingDoc}
              onDeleteDoc={handleDeleteDoc}
              onExtractQuestions={handleExtractQuestions}
            />
          </ProtectedLayout>
        } />

        <Route path={ROUTES.PYQS} element={
          <ProtectedLayout {...layoutProps}>
            <PYQView startCustomTest={handleStartPYQTest} />
          </ProtectedLayout>
        } />

        <Route path={ROUTES.SYLLABUS} element={
          <ProtectedLayout {...layoutProps}>
            <SyllabusView />
          </ProtectedLayout>
        } />

        <Route path="/news" element={
          <ProtectedLayout {...layoutProps}>
            <NewsView />
          </ProtectedLayout>
        } />

        <Route path={ROUTES.LEADERBOARD} element={
          <ProtectedLayout {...layoutProps}>
            <LeaderboardView />
          </ProtectedLayout>
        } />

        <Route path={ROUTES.PROFILE} element={
          <ProtectedLayout {...layoutProps}>
            <ProfileView />
          </ProtectedLayout>
        } />

        <Route path="/flashcards" element={
          <ProtectedLayout {...layoutProps}>
            <FlashcardsView />
          </ProtectedLayout>
        } />

        <Route path={ROUTES.TEST_HISTORY} element={
          <ProtectedLayout {...layoutProps}>
            <TestHistoryView />
          </ProtectedLayout>
        } />

        <Route path={ROUTES.TEST_REVIEW} element={
          <ProtectedLayout {...layoutProps}>
            <TestReviewView />
          </ProtectedLayout>
        } />

        <Route path={ROUTES.TEST_REVIEW} element={
          <ProtectedLayout {...layoutProps}>
            <TestReviewView />
          </ProtectedLayout>
        } />

        {/* Student Institution Join */}
        <Route path="/institution/join" element={
          <ProtectedLayout {...layoutProps}>
            <StudentInstitutionView startInstitutionTest={startInstitutionTest} />
          </ProtectedLayout>
        } />

        <Route path="/student/classroom" element={
          <ProtectedLayout {...layoutProps}>
            <StudentClassroom userData={userData} startInstitutionTest={startInstitutionTest} />
          </ProtectedLayout>
        } />

        {/* Institution Routes */}
        <Route path="/institution/dashboard" element={
          <ProtectedLayout {...layoutProps}>
            <InstitutionDashboard userData={userData} />
          </ProtectedLayout>
        } />
        <Route path="/institution/batches" element={
          <ProtectedLayout {...layoutProps}>
            <div className="pb-20 space-y-6">
              <h1 className="text-2xl md:text-3xl font-black text-slate-800 mb-2">Batch & Student Management</h1>
              <p className="text-slate-500 mb-6">Organize your students into classrooms and manage their access to private tests.</p>
              <BatchManager userData={userData} />
            </div>
          </ProtectedLayout>
        } />
        <Route path="/institution/create-test" element={
          <ProtectedLayout {...layoutProps}>
            <TestCreator userData={userData} />
          </ProtectedLayout>
        } />
        <Route path="/institution/tests" element={
          <ProtectedLayout {...layoutProps}>
            <TestManager userData={userData} />
          </ProtectedLayout>
        } />
        <Route path="/institution/test/:testId" element={
          <ProtectedLayout {...layoutProps}>
            <TestAnalytics />
          </ProtectedLayout>
        } />

        {/* Admin Routes */}
        <Route path="/admin/*" element={
          <AdminLayout>
            <Routes>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="cms" element={<AdminCMS />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </AdminLayout>
        } />

        {/* Fallback Route */}
        <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
