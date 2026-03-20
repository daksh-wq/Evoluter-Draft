import React from 'react';
import { Bell, Trash2, CheckCircle, Building2, UserCheck, FileText as FileTextIcon } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';

const NotificationsView = ({ userData, setView }) => {
    const { notifications, loading, markAsViewed } = useNotifications(userData);

    const handleNotificationClick = (item) => {
        markAsViewed(item.id);
        setView('student/classroom');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 px-4 pt-4 pb-20 max-w-4xl mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-800 mb-2 flex items-center gap-3">
                        <Bell className="text-indigo-600" size={28} />
                        Notifications
                    </h1>
                    <p className="text-slate-500">Stay updated with your latest assignments, batches, and institute news.</p>
                </div>
            </div>

            {/* Notifications List */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                {notifications.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
                            <Bell size={32} className="text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700">No Notifications</h3>
                        <p className="text-sm">You're all caught up!</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {notifications.map(item => {
                            let Icon = Bell;
                            let title = '';
                            let message = '';
                            let typeColor = 'indigo';

                            if (item.type === 'batch') {
                                Icon = Building2;
                                title = `Joined Batch ${item.data.name}`;
                                message = `You have been added to the batch ${item.data.name}.`;
                                typeColor = 'emerald';
                            } else if (item.type === 'test') {
                                Icon = FileTextIcon;
                                title = item.data.title;
                                message = `Test is Live! Tap to view in Classroom.`;
                                typeColor = 'indigo';
                            } else if (item.type === 'institution') {
                                Icon = UserCheck;
                                title = `Joined Institution: ${item.data.name}`;
                                message = `You have been exclusively invited and added to ${item.data.name}.`;
                                typeColor = 'blue';
                            }

                            return (
                                <div 
                                    key={item.id} 
                                    className={`p-4 md:p-6 transition-colors group flex gap-4 items-start w-full text-left ${item.isViewed ? 'bg-white opacity-70' : 'bg-slate-50/50 hover:bg-slate-50'}`}
                                >
                                    {/* Icon */}
                                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full bg-${typeColor}-100 text-${typeColor}-600 flex items-center justify-center flex-shrink-0 mt-1`}>
                                        <Icon size={20} />
                                    </div>

                                    {/* Content (Clickable) */}
                                    <div 
                                        className="flex-1 min-w-0 cursor-pointer"
                                        onClick={() => handleNotificationClick(item)}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className={`text-base font-bold text-slate-800 line-clamp-1 ${!item.isViewed ? 'text-slate-900' : ''}`}>
                                                {title}
                                            </h3>
                                            {!item.isViewed && (
                                                <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"></span>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-500 line-clamp-2 md:line-clamp-none">
                                            {message}
                                        </p>
                                        <div className="text-xs text-slate-400 mt-2 font-medium">
                                            {new Date(item.timestamp).toLocaleString()}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col sm:flex-row items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                        {!item.isViewed && (
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    markAsViewed(item.id);
                                                }}
                                                className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors tooltip tooltip-left"
                                                data-tip="Mark as Read"
                                                title="Mark as Read"
                                            >
                                                <CheckCircle size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsView;
