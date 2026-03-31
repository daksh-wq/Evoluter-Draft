import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { GlobalStyles } from './components/common';
import GlobalBanner from './components/common/GlobalBanner';
import { Sidebar } from './components/layout';
import AIAssistant from './components/common/AIAssistant';
import RouteErrorBoundary from './components/error/RouteErrorBoundary';
import logo from './assets/logo1.png';

// Lazy load route components for code splitting
const LoginView = lazy(() => import('./components/views/LoginView'));
const Dashboard = lazy(() => import('./components/views/Dashboard'));
const LibraryView = lazy(() => import('./components/views/LibraryView'));
const PYQView = lazy(() => import('./components/views/PYQView'));
const SyllabusView = lazy(() => import('./components/views/SyllabusView'));
// const NewsView = lazy(() => import('./components/views/NewsView'));
// const LeaderboardView = lazy(() => import('./components/views/LeaderboardView'));
const TestView = lazy(() => import('./components/views/TestView'));
const OnboardingView = lazy(() => import('./components/views/OnboardingView'));
const ResultView = lazy(() => import('./components/views/ResultView'));
const HomeView = lazy(() => import('./components/views/HomeView'));
const FlashcardsView = lazy(() => import('./components/views/FlashcardsView'));
const TestHistoryView = lazy(() => import('./components/views/TestHistoryView'));
const TestReviewView = lazy(() => import('./components/views/TestReviewView'));
const PerformanceReportView = lazy(() => import('./components/views/PerformanceReportView'));
const NotificationsView = lazy(() => import('./components/views/NotificationsView'));
const AboutView = lazy(() => import('./components/views/AboutView'));
const ContactView = lazy(() => import('./components/views/ContactView'));
const PrivacyView = lazy(() => import('./components/views/PrivacyView'));
const TermsView = lazy(() => import('./components/views/TermsView'));
const PricingView = lazy(() => import('./components/views/PricingView'));
const CheckoutView = lazy(() => import('./components/views/CheckoutView'));
const AdminLayout = lazy(() => import('./components/admin/layout/AdminLayout'));
const AdminDashboard = lazy(() => import('./components/admin/views/DashboardOverview'));
const UserManagement = lazy(() => import('./components/admin/views/UserManagement'));
const AdminCMS = lazy(() => import('./components/admin/views/CMS'));
const AdminAnalytics = lazy(() => import('./components/admin/views/AnalyticsDashboard'));
const AdminQuestionBank = lazy(() => import('./components/admin/views/QuestionBank'));

import NetworkStatus from './components/ui/NetworkStatus';
import ToastContainer from './components/ui/ToastContainer';
import { toast } from './utils/toast';

import { useAuth, useTest } from './hooks';
import { DEFAULT_USER_STATS, NAV_ITEMS, INSTITUTION_NAV_ITEMS } from './constants/data';
import { ROUTES } from './constants/routes';
import { DocumentProvider } from './contexts/DocumentContext';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from './services/firebase';
import logger from './utils/logger';
import { handleError, ErrorSeverity } from './utils/errorHandler';
import { RefreshCw, Menu, LogOut } from 'lucide-react';

// Institution Components (Lazy Load)
const InstitutionDashboard = lazy(() => import('./components/institution/InstitutionDashboard'));
const BatchManager = lazy(() => import('./components/institution/BatchManager'));
const TestCreator = lazy(() => import('./components/institution/TestCreator'));
const TestManager = lazy(() => import('./components/institution/TestManager'));
const StudentInstitutionView = lazy(() => import('./components/institution/StudentInstitutionView'));
const TestAnalytics = lazy(() => import('./components/institution/TestAnalytics'));
const InstitutionProfileView = lazy(() => import('./components/institution/InstitutionProfileView'));
const ProfileView = lazy(() => import('./components/views/ProfileView'));
const StudentClassroom = lazy(() => import('./components/student/StudentClassroom'));
const InstitutionStudentManager = lazy(() => import('./components/institution/InstitutionStudentManager'));

// Fix: module-level constant — never re-allocated on render
// Must match SUBJECTS in appConstants.js (excluding 'All Subjects')
const CANONICAL_TOPICS = [
  'Polity & Constitution',
  'Indian Economy',
  'Geography',
  'Science & Technology',
  'International Relations',
  'Art & Culture',
  'Environment',
  'Ancient & Medieval History',
  'Modern History'
];

// Fix: defined outside App so it is never re-created on every render cycle
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-slate-50">
    <div className="text-center">
      <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-slate-600 font-medium">Loading...</p>
    </div>
  </div>
);

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
  onOnboardingComplete,
  showLogoutModal,
  setShowLogoutModal
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
  // For students: only show Classroom if they are enrolled in at least one batch
  const isInBatch = Array.isArray(userData?.enrolledBatches) && userData.enrolledBatches.length > 0;
  const baseNavItems = userData?.role === 'institution' ? INSTITUTION_NAV_ITEMS : NAV_ITEMS;
  const navItems = baseNavItems.filter(item =>
      item.id !== 'student/classroom' || isInBatch
  );

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-[#2278B0]/20 selection:text-indigo-950">
      <GlobalStyles />
      <GlobalBanner />
      {/* ── App-level Logout Confirmation Modal ── */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-sm p-6">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <LogOut size={26} className="text-red-500" />
            </div>
            <h3 className="text-xl font-black text-slate-800 text-center mb-1">Logout?</h3>
            <p className="text-sm text-slate-500 text-center mb-6">
              You'll be signed out of your account. Any unsaved progress will be lost.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowLogoutModal(false); handleLogout(); }}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-all flex items-center justify-center gap-2"
              >
                <LogOut size={15} /> Logout
              </button>
            </div>
          </div>
        </div>
      )}

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
              <img
                src={logo}
                alt="Evoluter"
                className="h-6 object-contain"
              />
            </div>
          </div>

          <Sidebar
            onLogout={() => setShowLogoutModal(true)}
            navItems={navItems}
            user={user}
            userData={userData}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />

          {/* Mobile Overlay */}
          <div
            className={`fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
            onClick={() => setIsSidebarOpen(false)}
          />
        </>
      )}

      <main className={`transition-all duration-300 ${shouldHideNav ? 'pl-0' : 'md:pl-20 lg:pl-64'}`}>
        <div className={`min-h-screen ${shouldHideNav ? '' : 'py-2 sm:py-4 lg:py-6 max-w-7xl mx-auto'}`}>
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

  const exitZenMode = useCallback(() => {
    if (isZenMode) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => logger.warn("Exit fullscreen failed", err));
      }
      setIsZenMode(false);
    }
  }, [isZenMode]);

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = useCallback(async () => {
    exitZenMode();
    await authLogout();
    navigate(ROUTES.LOGIN);
  }, [exitZenMode, authLogout, navigate]);

  // Sanitize topicMastery: keep only the 10 canonical subjects.
  // Fix: memoized — only recomputed when userData.stats changes
  const userStats = useMemo(() => {
    const rawStats = userData?.stats || DEFAULT_USER_STATS;
    return {
      ...rawStats,
      topicMastery: CANONICAL_TOPICS.reduce((acc, topic) => {
        acc[topic] = rawStats.topicMastery?.[topic] ?? 0;
        return acc;
      }, {}),
    };
  }, [userData?.stats]);

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
  // Docs state moved to DocumentContext

  // Timer Effect (Restored since TestContext is not wrapped around App)
  useEffect(() => {
    let interval;
    if (activeTest) {
      interval = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTest, setTimeLeft]);

  // --- Logic Handlers ---

  const handleStartPYQTest = (questions, title) => {
    startCustomTest(questions, title);
    navigate(ROUTES.TEST);
  };

  // Upload and Delete logic moved to DocumentContext
  const handleExtractQuestions = async (docItem) => {
    if (!docItem.url) {
      toast.error('PDF URL not available. Please re-upload the document.');
      return;
    }
    logger.info('Starting Extract Questions', { docTitle: docItem.title });
    // This function uses internal useTest setters which aren't exposed,
    // so it delegates to startAITest/startMockTest patterns via navigate
    navigate(ROUTES.DASHBOARD);
  };

  // Mains logic moved to MainsEvaluatorView.jsx
  const startMission = useCallback(() => {
    startMockTest();
    navigate(ROUTES.TEST);
  }, [startMockTest, navigate]);

  const handleGenerateAITest = useCallback(async (topic, count, difficulty, resourceContent, pyqPercentage) => {
    if (!user) return;

    const stats = userData?.stats || {};
    const hasPremium = userData?.hasPremiumPlan || false;
    const testsGenerated = stats.diagnosticTestsGenerated || 0;
    const limit = hasPremium ? 100 : 3;

    if (testsGenerated >= limit) {
      if (!hasPremium) {
        toast.error(
          "You've reached the free limit of 3 tests. APPLY code 'EVOLUTER 2026' on the pricing page to get full access for 2 weeks!",
          { duration: 6000 }
        );
        navigate(ROUTES.PRICING);
      } else {
        toast.error("You've reached your plan's limit of 500 diagnostic tests.");
      }
      return;
    }

    try {
      await startAITest(topic, count, difficulty, userData?.targetExam || 'UPSC CSE', resourceContent, pyqPercentage);

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        'stats.diagnosticTestsGenerated': increment(1)
      });

      navigate(ROUTES.TEST);
    } catch (error) {
      handleError(error, 'Failed to generate test. Please try again.', ErrorSeverity.USER_FACING);
    }
  }, [user, userData, startAITest, navigate]);

  const handleZenToggle = useCallback(() => {
    if (!isZenMode) {
      document.documentElement.requestFullscreen().catch(logger.warn);
      setIsZenMode(true);
    } else {
      exitZenMode();
    }
  }, [isZenMode, exitZenMode]);

  const handleOnboardingComplete = (role) => {
    refreshUser();
    if (role === 'admin') {
      navigate('/admin', { replace: true });
    } else if (role === 'institution') {
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
    onOnboardingComplete: handleOnboardingComplete,
    showLogoutModal,
    setShowLogoutModal
  };

  // Loading fallback is defined at module level above (outside App)

  return (
    <Suspense fallback={<LoadingFallback />}>
      <ToastContainer />
      <NetworkStatus />
      <DocumentProvider>
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
          isAuthenticated && userData?.role === 'admin' ? <Navigate to="/admin" replace /> :
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
        <Route path={ROUTES.PRICING} element={<PricingView />} />
        <Route path={ROUTES.CHECKOUT} element={<CheckoutView />} />

        {/* Protected Routes - Student */}
        <Route path={ROUTES.DASHBOARD} element={
          <ProtectedLayout {...layoutProps}>
            {userData?.role === 'admin' ? (
              <Navigate to="/admin" replace />
            ) : userData?.role === 'institution' ? (
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

        <Route path={ROUTES.PERFORMANCE_REPORT} element={
          <ProtectedLayout {...layoutProps}>
            <PerformanceReportView userStats={userStats} />
          </ProtectedLayout>
        } />

        <Route path={ROUTES.NOTIFICATIONS} element={
          <ProtectedLayout {...layoutProps}>
            <NotificationsView userData={userData} setView={(v) => navigate(`/${v}`)} />
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
            <LibraryView />
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

        {/* <Route path="/news" element={
          <ProtectedLayout {...layoutProps}>
            <NewsView />
          </ProtectedLayout>
        } /> */}

        {/* <Route path={ROUTES.LEADERBOARD} element={
          <ProtectedLayout {...layoutProps}>
            <LeaderboardView />
          </ProtectedLayout>
        } /> */}

        <Route path={ROUTES.PROFILE} element={
          <ProtectedLayout {...layoutProps}>
            {userData?.role === 'institution' ? (
              <InstitutionProfileView user={user} userData={userData} onLogout={handleLogout} />
            ) : (
              <ProfileView user={user} userData={userData} onLogout={handleLogout} />
            )}
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

        {/* Student Institution Join */}
        <Route path="/institution/join" element={
          <ProtectedLayout {...layoutProps}>
            <StudentInstitutionView startInstitutionTest={startInstitutionTest} startMission={startMission} />
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
        <Route path="/institution/students" element={
          <ProtectedLayout {...layoutProps}>
            <InstitutionStudentManager userData={userData} />
          </ProtectedLayout>
        } />
        <Route path="/institution/batches" element={
          <ProtectedLayout {...layoutProps}>
            <div className="pb-20 space-y-6 px-4">
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
              <Route path="question-bank" element={<AdminQuestionBank />} />
              <Route path="cms" element={<AdminCMS />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </AdminLayout>
        } />

        {/* Fallback Route */}
        <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
      </Routes>
      </DocumentProvider>
    </Suspense>
  );
}

export default App;
