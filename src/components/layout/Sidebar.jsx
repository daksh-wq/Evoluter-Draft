import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
    Target,
    BookOpen,
    ListChecks,
    Newspaper,
    FileText,
    Trophy,
    LogOut,
    Zap,
    User,
    X,
    Clock,
    Users,
    UserCheck,
    History,
    BarChart2,
    LayoutDashboard,
    FileEdit,
} from 'lucide-react';

import logo from '../../assets/logo1.png';

// Icon mapping for nav items
const ICON_MAP = {
    Target,
    BookOpen,
    ListChecks,
    Newspaper,
    FileText,
    Trophy,
    User,
    Users,
    UserCheck,
    History,
    BarChart2,
    LayoutDashboard,
    FileEdit,
    Zap,
    Clock,
};

/**
 * Sidebar Navigation Component
 * @param {object} props
 * @param {string} props.currentView - Currently active view ID
 * @param {function} props.onNavigate - Navigation handler
 * @param {function} props.onLogout - Logout handler
 * @param {Array} props.navItems - Navigation items array
 * @param {object} props.user - Current user object
 */
const Sidebar = ({ onLogout, navItems, user, userData, isOpen, onClose }) => {
    // Helper to get display name safely
    const displayName = userData?.displayName || user?.displayName || 'User';
    const photoURL = userData?.photoURL || user?.photoURL;

    return (
        <nav className={`fixed left-0 top-0 h-full bg-white border-r border-slate-200 z-50 flex flex-col shadow-sm transition-transform duration-300 md:translate-x-0 w-64 md:w-20 lg:w-64 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            {/* Logo Section */}
            <div className="px-4 py-2 mt-6 flex items-center justify-center">
                <Link
                    to="/"
                    className="flex items-center justify-center w-full"
                    onClick={() => isOpen && onClose()}
                >
                    <img
                        src={logo}
                        alt="Evoluter"
                        className="h-6 md:h-6 lg:h-8 w-full object-contain"
                    />
                </Link>
            </div>
            {/* Navigation Items */}
            <div className="flex-1 px-4 py-6 space-y-1 overflow-y-auto scrollbar-hide">
                {
                    navItems.map((item) => {
                        const IconComponent = ICON_MAP[item.icon] || Target;
                        const path = `/${item.id}`; // Simple mapping now that dashboard is at /dashboard

                        return (
                            <NavLink
                                key={item.id}
                                to={path}
                                end={path === '/admin' || path === '/dashboard' || path === '/institution/dashboard'}
                                onClick={() => isOpen && onClose()}
                                title={item.label}
                                aria-label={item.label}
                                className={({ isActive }) => `w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group font-bold text-sm ${isActive
                                    ? 'bg-[#2278B0]/5 text-[#2278B0]'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                    }`}
                            >
                                {({ isActive }) => (
                                    <>
                                        <IconComponent
                                            size={20}
                                            className={
                                                isActive
                                                    ? 'text-[#2278B0]'
                                                    : 'text-slate-400 group-hover:text-slate-600'
                                            }
                                        />
                                        <span className="block md:hidden lg:block">{item.label}</span>
                                    </>
                                )}
                            </NavLink>
                        );
                    })
                }
            </div >

            {/* User Profile & Logout */}
            {
                user && (
                    <div className="p-4 border-t border-slate-100">
                        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors group">
                            <Link
                                to="/profile"
                                className="flex items-center gap-3 flex-1 overflow-hidden min-w-0 cursor-pointer"
                                onClick={() => isOpen && onClose()}
                            >
                                {/* Avatar */}
                                <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 flex-shrink-0 bg-slate-100">
                                    <img
                                        src={photoURL || `https://ui-avatars.com/api/?name=${displayName}&background=0D8ABC&color=fff`}
                                        alt="Profile"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = `https://ui-avatars.com/api/?name=${displayName}&background=0D8ABC&color=fff`;
                                        }}
                                    />
                                </div>

                                {/* User Info (Hidden on tablet, visible on mobile/desktop) */}
                                <div className="block md:hidden lg:block overflow-hidden min-w-0 flex-1">
                                    <div className="text-sm font-bold text-slate-800 truncate" title={displayName}>
                                        {displayName.split(' ')[0]}
                                    </div>
                                    <div className="text-xs text-slate-500 truncate" title={user.email}>
                                        {user.email}
                                    </div>
                                </div>
                            </Link>

                            {/* Logout Icon */}
                            <button
                                onClick={onLogout}
                                className="ml-auto p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all shadow-sm hover:shadow-md active:scale-90 active:bg-red-100"
                                title="Logout"
                            >
                                <LogOut size={18} />
                            </button>
                        </div>
                    </div>
                )
            }
        </nav >
    );
};

export default Sidebar;
