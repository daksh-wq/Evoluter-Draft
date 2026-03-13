import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../constants/routes';
import { useAuth } from '../../../hooks';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import {
    LayoutDashboard,
    Users,
    FileEdit,
    BarChart2,
    LogOut,
    Menu,
    X,
    ShieldAlert
} from 'lucide-react';

const AdminLayout = ({ children }) => {
    const { user, authLoading, handleLogout } = useAuth();
    const [isAdmin, setIsAdmin] = useState(null); // null = loading, false = unauthorized, true = authorized
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const checkAdminStatus = async () => {
            if (!user) {
                setIsAdmin(false);
                return;
            }

            try {
                // Check role: 'admin' field on the user's own document in 'users' collection
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);

                if (userDoc.exists() && userDoc.data().role === 'admin') {
                    setIsAdmin(true);
                } else {
                    console.warn('User attempted to access admin area without privileges:', user.uid);
                    setIsAdmin(false);
                }
            } catch (error) {
                console.error('Admin verification failed:', error);
                setIsAdmin(false);
            }
        };

        if (!authLoading) {
            checkAdminStatus();
        }
    }, [user, authLoading]);

    if (authLoading || isAdmin === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!isAdmin) {
        return <Navigate to={ROUTES.HOME} replace />;
    }

    const navItems = [
        { label: 'Dashboard', icon: LayoutDashboard, path: ROUTES.ADMIN_DASHBOARD },
        { label: 'Users', icon: Users, path: ROUTES.ADMIN_USERS },
        { label: 'Content (CMS)', icon: FileEdit, path: ROUTES.ADMIN_CMS },
        { label: 'Analytics', icon: BarChart2, path: ROUTES.ADMIN_ANALYTICS },
    ];

    return (
        <div className="min-h-screen bg-slate-100 flex">
            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } lg:relative lg:translate-x-0 shadow-xl`}
            >
                <div className="h-full flex flex-col">
                    {/* Header */}
                    <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
                            <ShieldAlert className="text-red-500" size={24} />
                            <span>Admin Panel</span>
                        </div>
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="lg:hidden text-slate-400 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                        {navItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <button
                                    key={item.path}
                                    onClick={() => navigate(item.path)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/50'
                                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                        }`}
                                >
                                    <item.icon size={20} />
                                    <span className="font-medium">{item.label}</span>
                                </button>
                            );
                        })}
                    </nav>

                    {/* User Profile / Logout */}
                    <div className="p-4 border-t border-slate-800 bg-slate-950">
                        <div className="flex items-center gap-3 px-2 mb-4">
                            <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
                                {user?.email?.[0]?.toUpperCase() || 'A'}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-medium text-white truncate">{user?.displayName || 'Admin User'}</p>
                                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-red-900/30 hover:text-red-400 transition-colors"
                        >
                            <LogOut size={16} />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
                {/* Mobile Header */}
                <header className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between shadow-sm z-40 relative">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="text-slate-600 p-2 hover:bg-slate-100 rounded-md"
                    >
                        <Menu size={24} />
                    </button>
                    <span className="font-bold text-slate-800">Admin</span>
                    <div className="w-10"></div> {/* Spacer */}
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-6">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>

            {/* Overlay for mobile sidebar */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}
        </div>
    );
};

export default AdminLayout;
