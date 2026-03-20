import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Building2, MapPin, Phone, Edit2, Save, X, Camera, LogOut, Home, Users, Info
} from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../../services/firebase';
import logger from '../../utils/logger';
import { toast } from '../../utils/toast';

/**
 * InstitutionProfileView Component
 * Institution profile management with editable fields
 */
const InstitutionProfileView = ({ user, userData, onLogout }) => {
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const fileInputRef = useRef(null);

    const [formData, setFormData] = useState({
        name: '',
        state: '',
        city: '',
        studentCount: '',
        contactNumber: '',
        logoUrl: '',
        bio: ''
    });

    // Initialize form with user data
    useEffect(() => {
        if (userData?.institutionProfile) {
            setFormData({
                name: userData.institutionProfile.name || userData.displayName || user?.displayName || '',
                state: userData.institutionProfile.state || '',
                city: userData.institutionProfile.city || '',
                studentCount: userData.institutionProfile.studentCount || '',
                contactNumber: userData.institutionProfile.contactNumber || '',
                logoUrl: userData.institutionProfile.logoUrl || userData.photoURL || user?.photoURL || '',
                bio: userData.institutionProfile.bio || ''
            });
        } else if (userData) {
            // Fallback
            setFormData({
                name: userData.displayName || user?.displayName || '',
                state: '',
                city: '',
                studentCount: '',
                contactNumber: '',
                logoUrl: userData.photoURL || user?.photoURL || '',
                bio: userData.bio || ''
            });
        }
    }, [userData, user]);

    // Handle File Selection and Upload
    const handleFileSelect = useCallback(async (e) => {
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
            const storageRef = ref(storage, `institutions/${user.uid}/profile_logo`);
            await uploadBytes(storageRef, file);
            const photoURL = await getDownloadURL(storageRef);

            // Update Auth Profile & Firestore
            await updateProfile(auth.currentUser, { photoURL });
            await setDoc(doc(db, 'users', user.uid), {
                photoURL,
                institutionProfile: { logoUrl: photoURL }
            }, { merge: true });

            setFormData(prev => ({ ...prev, logoUrl: photoURL }));
        } catch (error) {
            logger.error("Error uploading logo:", error);
            if (error.code === 'storage/retry-limit-exceeded' || error.message?.includes('network') || !error.code) {
                toast.error("Upload Failed: Network or CORS issue detected.\n\nSince you are on localhost, you likely need to configure CORS on your Firebase Storage bucket.");
            } else {
                toast.error(`Failed to upload logo: ${error.message}`);
            }
        } finally {
            setUploadingPhoto(false);
        }
    }, [user?.uid]);

    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleSave = useCallback(async () => {
        setIsSaving(true);
        try {
            const userRef = doc(db, 'users', user.uid);
            await setDoc(userRef, {
                displayName: formData.name, // sync display name
                institutionProfile: {
                    name: formData.name,
                    state: formData.state,
                    city: formData.city,
                    studentCount: formData.studentCount,
                    contactNumber: formData.contactNumber,
                    logoUrl: formData.logoUrl,
                    bio: formData.bio
                }
            }, { merge: true });
            setIsEditing(false);
            toast.success("Changes saved successfully!");
        } catch (error) {
            logger.error("Error updating profile:", error);
            toast.error("Failed to save changes.");
        } finally {
            setIsSaving(false);
        }
    }, [user?.uid, formData]);

    return (
        <>
        <div className="animate-in fade-in duration-500 pb-20 pt-6 px-4 sm:px-6 max-w-4xl mx-auto">
            {/* Header */}
            <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">Institution Profile</h1>
                    <p className="text-slate-500 mt-1">Manage your institution details and preferences.</p>
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
                                {formData.logoUrl ? (
                                    <img
                                        src={formData.logoUrl}
                                        alt="Institution Logo"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <Building2 className="text-slate-400 w-16 h-16" />
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

                        <h2 className="text-xl font-black text-slate-800 mb-1">
                            {formData.name || "Institution Name"}
                        </h2>
                        <p className="text-slate-500 text-sm font-medium mb-4">{user?.email}</p>

                        {userData?.institutionProfile?.isVerified && (
                            <div className="bg-green-50 text-green-600 font-bold text-xs px-3 py-1.5 rounded-full flex items-center gap-1">
                                Verified Institution
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Editable Details */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm relative overflow-hidden">
                        <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-4 mb-6">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Building2 size={20} className="text-orange-500" /> Institution Details
                            </h3>
                            {!isEditing ? (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="text-orange-600 hover:bg-orange-50 p-2 rounded-lg transition-colors"
                                >
                                    <Edit2 size={18} />
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="text-slate-400 hover:bg-slate-50 p-2 rounded-lg transition-colors"
                                    >
                                        <X size={18} />
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="bg-orange-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-orange-600 shadow-lg shadow-orange-500/20"
                                    >
                                        {isSaving ? "Saving..." : <><Save size={16} /> Save Changes</>}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-5">
                            {/* Institution Name */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Institution Name</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-bold text-slate-700"
                                    />
                                ) : (
                                    <div className="font-bold text-slate-800 text-lg">{formData.name || "N/A"}</div>
                                )}
                            </div>

                            {/* Location Details */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                                        <MapPin size={12} /> State
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            name="state"
                                            value={formData.state}
                                            onChange={handleChange}
                                            className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-bold text-slate-700"
                                        />
                                    ) : (
                                        <div className="font-bold text-slate-800">{formData.state || "N/A"}</div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                                        <MapPin size={12} /> City
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            name="city"
                                            value={formData.city}
                                            onChange={handleChange}
                                            className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-bold text-slate-700"
                                        />
                                    ) : (
                                        <div className="font-bold text-slate-800">{formData.city || "N/A"}</div>
                                    )}
                                </div>
                            </div>

                            {/* Contact & Student Count */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                                        <Phone size={12} /> Contact Number
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="tel"
                                            name="contactNumber"
                                            value={formData.contactNumber}
                                            onChange={handleChange}
                                            className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-bold text-slate-700"
                                        />
                                    ) : (
                                        <div className="font-bold text-slate-800">{formData.contactNumber || "N/A"}</div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                                        <Users size={12} /> Student Base Size
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="number"
                                            name="studentCount"
                                            value={formData.studentCount}
                                            onChange={handleChange}
                                            className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-bold text-slate-700"
                                        />
                                    ) : (
                                        <div className="font-bold text-slate-800">{formData.studentCount || "N/A"}</div>
                                    )}
                                </div>
                            </div>

                            {/* Bio / About */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                                    <Info size={12} /> About Institution
                                </label>
                                {isEditing ? (
                                    <textarea
                                        name="bio"
                                        value={formData.bio}
                                        onChange={handleChange}
                                        placeholder="e.g. Leading academy since 2010..."
                                        rows={3}
                                        className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-medium text-slate-700 resize-none"
                                    />
                                ) : (
                                    <p className="text-slate-600 leading-relaxed">
                                        {formData.bio || "No about added yet."}
                                    </p>
                                )}
                            </div>
                            <div className="w-full mt-auto pt-6">
                                <button
                                    onClick={() => setShowLogoutModal(true)}
                                    className="w-full bg-red-50 text-red-600 px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
                                >
                                    <LogOut size={18} /> Logout
                                </button>
                            </div>
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
                        You'll be signed out of your institution account.
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
    );
};

export default InstitutionProfileView;
