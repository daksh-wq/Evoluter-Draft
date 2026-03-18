import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    User, Mail, Target, Calendar, Edit2, Save, X, Camera, LogOut, CheckCircle, Home
} from 'lucide-react';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../../services/firebase';
import logger from '../../utils/logger';
import { toast } from '../../utils/toast';
import { CustomDropdown } from '../common';

/**
 * ProfileView Component
 * User profile management with editable fields
 */
const ProfileView = ({ user, userData, onLogout }) => {
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const fileInputRef = useRef(null);
    const [formData, setFormData] = useState({
        displayName: '',
        targetExam: '',
        targetYear: '',
        bio: ''
    });

    // Initialize form with user data
    useEffect(() => {
        if (userData) {
            setFormData({
                displayName: userData.displayName || user?.displayName || '',
                targetExam: userData.targetExam || 'UPSC CSE',
                targetYear: userData.targetYear || '2025',
                bio: userData.bio || ''
            });
        }
    }, [userData, user]);

    // Handle File Selection and Upload
    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.warning('Please select an image file.');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            toast.warning('File size should be less than 2MB.');
            return;
        }

        try {
            setUploadingPhoto(true);
            // Match storage rules: match /users/{userId}/profile/{fileName}
            const storageRef = ref(storage, `users/${user.uid}/profile/profile_photo`);
            const snapshot = await uploadBytes(storageRef, file);
            const photoURL = await getDownloadURL(storageRef);

            // Update Auth Profile & Firestore
            await updateProfile(auth.currentUser, { photoURL });
            // Use setDoc to be safe
            await setDoc(doc(db, 'users', user.uid), { photoURL }, { merge: true });

            setFormData(prev => ({ ...prev, photoURL }));
        } catch (error) {
            logger.error("Error uploading photo:", error);

            // Check for CORS-like network errors
            if (error.code === 'storage/retry-limit-exceeded' || error.message?.includes('network') || !error.code) {
                toast.error("Upload Failed: Network or CORS issue detected. Check console for details.");
                logger.warn(`
                 --------------------------------------------------------------------------------
                 MISSING CORS CONFIGURATION?
                 
                 If you are seeing CORS errors in the console, you need to configure your Firebase Storage bucket.
                 
                 1. Create a file named 'cors.json' with this content:
                    [
                      {
                        "origin": ["*"],
                        "method": ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH", "OPTIONS"],
                        "maxAgeSeconds": 3600
                      }
                    ]
                 
                 2. Run this legacy command (if you have gsutil):
                    gsutil cors set cors.json gs://${storage.app.options.storageBucket}
                    
                 OR use the Google Cloud Console to add CORS allowed origins.
                 --------------------------------------------------------------------------------
                 `);
            } else {
                toast.error(`Failed to upload photo: ${error.message}`);
            }
        } finally {
            setUploadingPhoto(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const userRef = doc(db, 'users', user.uid);
            // Use setDoc with merge: true to handle both update and create scenarios
            await setDoc(userRef, {
                displayName: formData.displayName,
                targetExam: formData.targetExam,
                targetYear: formData.targetYear,
                bio: formData.bio
            }, { merge: true });
            setIsEditing(false);
            toast.success("Changes saved successfully!");
        } catch (error) {
            logger.error("Error updating profile:", error);
            toast.error("Failed to save changes.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
        <div className="animate-in fade-in duration-500 pb-20 max-w-4xl mx-auto">
            {/* Header */}
            <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-indigo-950 tracking-tight">My Profile</h1>
                    <p className="text-slate-500 mt-1">Manage your account and learning preferences.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                {/* Left Column: Avatar & Basic Info */}
                <div className="md:col-span-1">
                    <div className="bg-white border border-slate-200 rounded-3xl p-8 flex flex-col items-center shadow-sm text-center h-full">
                        <div
                            className="relative mb-6 group cursor-pointer"
                            onClick={() => !uploadingPhoto && fileInputRef.current?.click()}
                        >
                            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-50 shadow-inner bg-slate-100 flex items-center justify-center">
                                {formData.photoURL || user?.photoURL ? (
                                    <img
                                        src={formData.photoURL || user?.photoURL}
                                        alt="Profile"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <User className="text-slate-400 w-16 h-16" />
                                )}
                            </div>
                            <div className={`absolute inset-0 bg-black/40 rounded-full flex items-center justify-center transition-opacity ${uploadingPhoto ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                {uploadingPhoto ? (
                                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Camera className="text-white" size={24} />
                                )}
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                className="hidden"
                                accept="image/*"
                            />
                        </div>

                        <h2 className="text-xl font-black text-indigo-950 mb-1">
                            {formData.displayName || "Scholar"}
                        </h2>
                        <p className="text-slate-500 text-sm font-medium mb-4">{user?.email}</p>

                        <div className="w-full text-center text-xs font-bold text-slate-500 mt-2 space-y-3">
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 w-full">
                                <div className="text-orange-500 text-lg mb-1">{userData?.stats?.streakDays || 0}</div>
                                CURRENT STREAK
                            </div>

                            <div className={`p-4 rounded-xl border w-full flex flex-col items-center gap-1 ${userData?.hasPremiumPlan ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100'}`}>
                                <div className="flex items-center gap-1.5 mb-1">
                                    <div className={`w-2 h-2 rounded-full ${userData?.hasPremiumPlan ? 'bg-indigo-600 animate-pulse' : 'bg-slate-400'}`} />
                                    <span className={`text-[10px] uppercase tracking-widest font-black ${userData?.hasPremiumPlan ? 'text-indigo-600' : 'text-slate-500'}`}>
                                        {userData?.hasPremiumPlan ? 'Premium Active' : 'Free Tier'}
                                    </span>
                                </div>
                                {userData?.hasPremiumPlan ? (
                                    <>
                                        <div className="bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full mb-1">
                                            2 WEEK FREE TRIAL
                                        </div>
                                        <div className="text-indigo-950 font-black text-xs">
                                            {userData?.planType === '12mo' ? 'Full Marathon (12Mo)' : (userData?.planType === '6mo' ? 'Half Marathon (6Mo)' : 'Sprinter (3Mo)')}
                                        </div>
                                        <div className="text-[9px] text-indigo-400 font-bold mt-1">
                                            Valid Until: {userData?.trialExpiresAt ? new Date(userData.trialExpiresAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                                        </div>
                                    </>
                                ) : (
                                    <button 
                                        onClick={() => navigate('/pricing')}
                                        className="text-[9px] text-[#2278B0] underline font-black hover:text-[#1b5f8a] transition-colors"
                                    >
                                        UPGRADE FOR FULL ACCESS
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Editable Details */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm relative overflow-hidden">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <User size={20} className="text-[#2278B0]" /> Personal Details
                            </h3>
                            {!isEditing ? (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="text-[#2278B0] hover:bg-[#2278B0]/5 p-2 rounded-lg transition-colors"
                                >
                                    <Edit2 size={18} />
                                </button>
                            ) : (
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="text-slate-400 hover:bg-slate-50 p-2 rounded-lg transition-colors border border-slate-200"
                                >
                                    <X size={18} />
                                </button>
                            )}
                        </div>

                        <div className="space-y-5">
                            {/* Full Name */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Full Name</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="displayName"
                                        value={formData.displayName}
                                        onChange={handleChange}
                                        className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#2278B0]/20 font-bold text-slate-700"
                                    />
                                ) : (
                                    <div className="font-bold text-slate-800 text-lg">{formData.displayName}</div>
                                )}
                            </div>

                            {/* Target Exam & Year */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                                        <Target size={12} /> Target Exam
                                    </label>
                                    {isEditing ? (
                                        <CustomDropdown
                                            options={[
                                                { label: 'UPSC CSE', value: 'UPSC CSE' },
                                                { label: 'State PSC', value: 'State PSC' }
                                            ]}
                                            value={formData.targetExam}
                                            onChange={(val) => setFormData(prev => ({ ...prev, targetExam: val }))}
                                            fullWidth={true}
                                        />
                                    ) : (
                                        <div className="font-bold text-slate-800">{formData.targetExam}</div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                                        <Calendar size={12} /> Target Year
                                    </label>
                                    {isEditing ? (
                                        <CustomDropdown
                                            options={[0, 1, 2, 3].map(offset => {
                                                const year = String(new Date().getFullYear() + offset);
                                                return { label: year, value: year };
                                            })}
                                            value={String(formData.targetYear)}
                                            onChange={(val) => setFormData(prev => ({ ...prev, targetYear: val }))}
                                            fullWidth={true}
                                        />
                                    ) : (
                                        <div className="font-bold text-slate-800">{formData.targetYear}</div>
                                    )}
                                </div>
                            </div>

                            {/* Bio */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Study Bio / Goals</label>
                                {isEditing ? (
                                    <textarea
                                        name="bio"
                                        value={formData.bio}
                                        onChange={handleChange}
                                        placeholder="e.g. Aiming for top 100 rank..."
                                        rows={3}
                                        className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#2278B0]/20 font-medium text-slate-700 resize-none"
                                    />
                                ) : (
                                    <p className="text-slate-600 leading-relaxed">
                                        {formData.bio || "No bio added yet."}
                                    </p>
                                )}
                            </div>

                            {isEditing && (
                                <div className="w-full mt-6 pt-4 border-t border-slate-100">
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="w-full bg-[#2278B0] text-white px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#1b5f8a] shadow-lg shadow-[#2278B0]/20 transition-all"
                                    >
                                        {isSaving ? "Saving..." : <><Save size={18} /> Save Changes</>}
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="w-full mt-auto pt-6">
                            <button
                                onClick={() => setShowLogoutModal(true)}
                                className="w-full bg-red-50 text-red-600 px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
                            >
                                <LogOut size={18} /> Logout Account
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div >

        {/* Logout Confirmation Modal */}
        {showLogoutModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
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
                            onClick={() => { setShowLogoutModal(false); onLogout(); }}
                            className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-all flex items-center justify-center gap-2"
                        >
                            <LogOut size={15} /> Logout
                        </button>
                    </div>
                </div>
            </div>
        )}
    </>
};

export default ProfileView;
