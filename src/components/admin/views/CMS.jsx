import React, { useEffect, useState } from 'react';
import { db } from '../../../services/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Save, Loader } from 'lucide-react';
import { toast } from '../../../utils/toast';

const CMS = () => {
    const [content, setContent] = useState({
        globalBanner: '',
        showBanner: false,
        featuredTopic: '',
        maintenanceMode: false
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchContent = async () => {
            try {
                const docRef = doc(db, 'content', 'global_config');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setContent(docSnap.data());
                }
            } catch (error) {
                console.error('Error fetching CMS content:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchContent();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setContent(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await setDoc(doc(db, 'content', 'global_config'), {
                ...content,
                updatedAt: serverTimestamp()
            });
            toast.success('Content updated successfully!');
        } catch (error) {
            console.error('Error saving content:', error);
            toast.error('Failed to save changes.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Loading CMS...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-800">Content Management (CMS)</h1>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                    {saving ? <Loader className="animate-spin" size={20} /> : <Save size={20} />}
                    <span>Save Changes</span>
                </button>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2">Global Settings</h2>

                <div className="space-y-6">
                    {/* Banner settings */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-slate-700">Top Banner Message</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    name="showBanner"
                                    checked={content.showBanner}
                                    onChange={handleChange}
                                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                />
                                <span className="text-sm text-slate-600">Enable</span>
                            </div>
                        </div>
                        <input
                            type="text"
                            name="globalBanner"
                            value={content.globalBanner}
                            onChange={handleChange}
                            placeholder="e.g., 'Maintenance scheduled for tonight at 10 PM'"
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <p className="text-xs text-slate-500">This message will appear at the top of the user dashboard.</p>
                    </div>

                    {/* Feature Toggles */}
                    <div className="pt-4 border-t border-slate-100">
                        <h3 className="text-sm font-medium text-slate-700 mb-3">Feature Toggles</h3>

                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div>
                                <div className="font-medium text-slate-800">Maintenance Mode</div>
                                <div className="text-xs text-slate-500">Disable login for all users</div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="maintenanceMode"
                                    checked={content.maintenanceMode}
                                    onChange={handleChange}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CMS;
