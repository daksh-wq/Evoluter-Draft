import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ROUTES } from '../../../constants/routes';
import { useAuth } from '../../../hooks';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { Menu, LogOut } from 'lucide-react';
import logger from '../../../utils/logger';
import { Sidebar } from '../../layout';
import { ADMIN_NAV_ITEMS } from '../../../constants/data';
import logo from '../../../assets/logo1.png';

const AdminLayout = ({ children }) => {
    const { user, authLoading, handleLogout } = useAuth();
    const [isAdmin, setIsAdmin] = useState(null); // null = loading, false = unauthorized, true = authorized
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [adminUserData, setAdminUserData] = useState(null);

    useEffect(() => {
        const checkAdminStatus = async () => {
            if (!user) {
                setIsAdmin(false);
                return;
            }

            try {
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);

                if (userDoc.exists() && userDoc.data().role === 'admin') {
                    setIsAdmin(true);
                    setAdminUserData(userDoc.data());
                } else {
                    logger.warn('User attempted to access admin area without privileges:', user.uid);
                    setIsAdmin(false);
                }
            } catch (error) {
                logger.error('Admin verification failed:', error);
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2278B0]"></div>
            </div>
        );
    }

    if (!isAdmin) {
        return <Navigate to={ROUTES.HOME} replace />;
    }

    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-[#2278B0]/20 selection:text-indigo-950">
            {/* ── App-level Logout Confirmation Modal ── */}
            {showLogoutModal && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-sm p-6">
                        <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                            <LogOut size={26} className="text-red-500" />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 text-center mb-1">Logout?</h3>
                        <p className="text-sm text-slate-500 text-center mb-6">
                            You'll be signed out of your admin account.
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
                        alt="Evoluter Admin"
                        className="h-6 object-contain"
                    />
                </div>
                <div className="text-xs font-bold text-[#2278B0] bg-[#2278B0]/10 px-2 py-1 rounded-md">
                    ADMIN
                </div>
            </div>

            <Sidebar
                onLogout={() => setShowLogoutModal(true)}
                navItems={ADMIN_NAV_ITEMS}
                user={user}
                userData={adminUserData}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            {/* Mobile Overlay */}
            <div
                className={`fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                onClick={() => setIsSidebarOpen(false)}
            />

            <main className="transition-all duration-300 md:pl-20 lg:pl-64">
                <div className="py-2 sm:py-4 lg:py-6 max-w-7xl mx-auto px-4 md:px-8 pt-4 md:pt-6">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
