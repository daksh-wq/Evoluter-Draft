/**
 * Static data and constants for Evoluter
 * Contains configuration constants
 */

// UPSC Syllabus structure with progress tracking
export const SYLLABUS_DATA = {
    'GS Paper 1': [
        { id: 'g1-1', topic: 'Indian Heritage and Culture', completed: 60 },
        { id: 'g1-2', topic: 'History of the World', completed: 20 },
        { id: 'g1-3', topic: 'Geography of the World', completed: 45 },
        { id: 'g1-4', topic: 'Society', completed: 80 },
    ],
    'GS Paper 2': [
        { id: 'g2-1', topic: 'Constitution & Polity', completed: 75 },
        { id: 'g2-2', topic: 'Governance', completed: 30 },
        { id: 'g2-3', topic: 'Social Justice', completed: 10 },
        { id: 'g2-4', topic: 'International Relations', completed: 50 },
    ],
    'GS Paper 3': [
        { id: 'g3-1', topic: 'Indian Economy', completed: 40 },
        { id: 'g3-2', topic: 'Science & Technology', completed: 65 },
        { id: 'g3-3', topic: 'Environment & Bio-diversity', completed: 55 },
        { id: 'g3-4', topic: 'Disaster Management', completed: 90 },
    ],
};

// Default user statistics
export const DEFAULT_USER_STATS = {
    totalQuestionsSolved: 0,
    accuracy: 0,
    masteredCount: 0,
    streakDays: 0,
    xp: 0,
    level: 1,
    topicMastery: {
        'Indian Polity': 0,
        'Ancient and Medieval History': 0,
        'Modern India': 0,
        'Indian Culture': 0,
        'Geography': 0,
        'Economy of India': 0,
        'Environment': 0,
        'Science and Technology': 0,
        'Current Affairs': 0,
        'Trivial': 0,
    },
    diagnosticTestsGenerated: 0,
};

export const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: 'Target' },
    { id: 'student/classroom', label: 'Classroom', icon: 'Users' },
    { id: 'institution/join', label: 'Join Test', icon: 'UserCheck' },
    // { id: 'library', label: 'Library', icon: 'BookOpen' },
    { id: 'pyqs', label: 'PYQs', icon: 'History' },
    { id: 'test-history', label: 'Test History', icon: 'Clock' },
    { id: 'performance-report', label: 'Performance Report', icon: 'BarChart2' },
    // { id: 'syllabus', label: 'Syllabus', icon: 'ListChecks' },
    // { id: 'news', label: 'Current Affairs', icon: 'Newspaper' },
    // { id: 'mains', label: 'Evaluator', icon: 'FileText' },
    // { id: 'leaderboard', label: 'Leaderboard', icon: 'Trophy' },
];

export const INSTITUTION_NAV_ITEMS = [
    { id: 'institution/dashboard', label: 'Dashboard', icon: 'Target' },
    { id: 'institution/students', label: 'Students', icon: 'UserCheck' },
    { id: 'institution/batches', label: 'Batches', icon: 'Users' },
    { id: 'institution/create-test', label: 'Create Test', icon: 'Zap' },
    { id: 'institution/tests', label: 'Test Management', icon: 'ListChecks' },
];

export const ADMIN_NAV_ITEMS = [
    { id: 'admin', label: 'Dashboard', icon: 'LayoutDashboard' },
    { id: 'admin/users', label: 'Users & Institutions', icon: 'Users' },
    { id: 'admin/cms', label: 'Content (CMS)', icon: 'FileEdit' },
    { id: 'admin/analytics', label: 'Analytics', icon: 'BarChart2' },
];

// Topics for mock question generation
export const QUESTION_TOPICS = ['History', 'Economy', 'Polity', 'Science', 'Geography'];
export const QUESTION_SUBJECTS = [
    'The Revolt of 1857',
    'Fiscal Deficit',
    'Fundamental Rights',
    'CRISPR',
    'Monsoon Patterns',
];

// Library tabs
export const LIBRARY_TABS = [
    'All Resources',
    'Standard Books',
    'NCERTs',
    'Current Affairs',
    'Topper Notes',
];
