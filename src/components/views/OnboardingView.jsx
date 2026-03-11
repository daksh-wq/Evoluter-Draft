import React, { useState, useRef, useEffect } from 'react';
import { Target, Calendar, User, ArrowRight, RefreshCw, Building2, GraduationCap, MapPin, Phone, Upload, CheckCircle } from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../services/firebase'; // Ensure storage is exported in firebase.js
import { DEFAULT_USER_STATS } from '../../constants/data';
import logger from '../../utils/logger';
import { toast } from '../../utils/toast';
import { CustomDropdown } from '../common';

/**
 * OnboardingView Component
 * Collects initial user details for profile creation.
 * Supports both STUDENT and INSTITUTION roles.
 */
const OnboardingView = ({ user, onComplete }) => {
    // Step 1: Role Selection, Step 2: Details
    const [step, setStep] = useState(1);
    const [role, setRole] = useState('student'); // 'student' | 'institution'

    // Check for role intent passed from LoginView/HomeView
    useEffect(() => {
        const roleIntent = sessionStorage.getItem('onboarding_role_intent');
        if (roleIntent === 'institution') {
            setRole('institution');
            setStep(2);
        }
    }, []);

    // Student State
    const [targetExam, setTargetExam] = useState('UPSC CSE');
    const [targetYear, setTargetYear] = useState('2025');

    // Institution State
    const [instData, setInstData] = useState({
        name: '',
        state: '',
        city: '',
        studentCount: '',
        contactNumber: ''
    });
    const [logoFile, setLogoFile] = useState(null);
    const fileInputRef = useRef(null);

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleInstChange = (e) => {
        setInstData({ ...instData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setLogoFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            let additionalData = {};

            if (role === 'institution') {
                // Upload Logo if exists
                let logoUrl = '';
                if (logoFile) {
                    try {
                        const extension = logoFile.name.split('.').pop() || 'png';
                        const storageRef = ref(storage, `institutions/${user.uid}/logo_${Date.now()}.${extension}`);
                        const snapshot = await uploadBytes(storageRef, logoFile, { contentType: logoFile.type });
                        logoUrl = await getDownloadURL(snapshot.ref);
                    } catch (uploadError) {
                        logger.error("Logo upload failed:", uploadError);
                        // Show warning but continue with signup
                        toast.warning("Warning: Logo upload failed. Account will be created without logo.");
                    }
                }

                additionalData = {
                    role: 'institution',
                    institutionProfile: {
                        name: instData.name,
                        state: instData.state,
                        city: instData.city,
                        studentCount: instData.studentCount,
                        contactNumber: instData.contactNumber,
                        logoUrl: logoUrl, // Will be empty string if upload failed
                        isVerified: false
                    }
                };
            } else {
                additionalData = {
                    role: 'student',
                    targetExam,
                    targetYear,
                    stats: {
                        ...DEFAULT_USER_STATS,
                        xp: 0,
                        streakDays: 0,
                        level: 1
                    }
                };
            }

            // Create user document in Firestore
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                name: user.displayName || (role === 'institution' ? instData.name : 'User'),
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                onboardingComplete: true,
                createdAt: serverTimestamp(),
                ...additionalData
            });

            // Trigger completion callback to refresh user data in App
            onComplete(role);
        } catch (error) {
            logger.error("Error creating profile:", error);
            toast.error("Failed to create profile. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- RENDER HELPERS ---

    const renderRoleSelection = () => (
        <div className="space-y-6 animate-in slide-in-from-right duration-500">
            <h3 className="text-xl font-bold text-slate-800 text-center mb-6">Who are you?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                    onClick={() => setRole('student')}
                    className={`p-6 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center gap-4 text-center group ${role === 'student' ? 'border-[#2278B0] bg-[#2278B0]/5 shadow-md' : 'border-slate-100 hover:border-slate-300'
                        }`}
                >
                    <div className={`p-4 rounded-full ${role === 'student' ? 'bg-[#2278B0] text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                        <GraduationCap size={32} />
                    </div>
                    <div>
                        <h4 className={`font-bold text-lg ${role === 'student' ? 'text-[#2278B0]' : 'text-slate-700'}`}>Student</h4>
                        <p className="text-xs text-slate-500 mt-1">I want to prepare for exams.</p>
                    </div>
                </div>

                <div
                    onClick={() => setRole('institution')}
                    className={`p-6 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center gap-4 text-center group ${role === 'institution' ? 'border-orange-500 bg-orange-50 shadow-md' : 'border-slate-100 hover:border-slate-300'
                        }`}
                >
                    <div className={`p-4 rounded-full ${role === 'institution' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                        <Building2 size={32} />
                    </div>
                    <div>
                        <h4 className={`font-bold text-lg ${role === 'institution' ? 'text-orange-600' : 'text-slate-700'}`}>Institution</h4>
                        <p className="text-xs text-slate-500 mt-1">I want to manage students & tests.</p>
                    </div>
                </div>
            </div>

            <button
                onClick={() => setStep(2)}
                className="w-full bg-indigo-950 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-indigo-900 transition-all flex items-center justify-center gap-2 mt-4"
            >
                Continue <ArrowRight size={20} />
            </button>
        </div>
    );

    const renderStudentForm = () => (
        <form onSubmit={handleSubmit} className="space-y-6 animate-in slide-in-from-right duration-500">
            {/* Target Exam Selection */}
            <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Target size={16} className="text-[#2278B0]" /> Target Exam
                </label>
                <div className="grid grid-cols-2 gap-3">
                    {['UPSC CSE', 'State PSC'].map((exam) => (
                        <div
                            key={exam}
                            onClick={() => setTargetExam(exam)}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all font-bold text-center ${targetExam === exam
                                ? 'border-[#2278B0] bg-[#2278B0]/5 text-[#2278B0]'
                                : 'border-slate-100 text-slate-500 hover:border-slate-200'
                                }`}
                        >
                            {exam}
                        </div>
                    ))}
                </div>
            </div>

            {/* Target Year Selection */}
            <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Calendar size={16} className="text-orange-500" /> Target Year
                </label>
                <CustomDropdown
                    options={[0, 1, 2, 3].map(offset => {
                        const year = String(new Date().getFullYear() + offset);
                        return { label: year, value: year };
                    })}
                    value={String(targetYear)}
                    onChange={(val) => setTargetYear(val)}
                    fullWidth={true}
                />
            </div>

            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-6 py-4 rounded-xl border border-slate-200 font-bold text-slate-500 hover:bg-slate-50"
                >
                    Back
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-indigo-950 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-indigo-900 transition-all flex items-center justify-center gap-2"
                >
                    {isSubmitting ? <RefreshCw size={20} className="animate-spin" /> : <>Complete Setup <CheckCircle size={20} /></>}
                </button>
            </div>
        </form>
    );

    const renderInstitutionForm = () => (
        <form onSubmit={handleSubmit} className="space-y-4 animate-in slide-in-from-right duration-500">
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Institution Code / Name</label>
                <div className="relative">
                    <Building2 className="absolute left-4 top-3.5 text-slate-400" size={18} />
                    <input
                        name="name"
                        value={instData.name}
                        onChange={handleInstChange}
                        required
                        placeholder="e.g. Apex Academy"
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none font-medium"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">State</label>
                    <div className="relative">
                        <MapPin className="absolute left-4 top-3.5 text-slate-400" size={18} />
                        <input
                            name="state"
                            value={instData.state}
                            onChange={handleInstChange}
                            required
                            placeholder="State"
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none font-medium"
                        />
                    </div>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">City</label>
                    <input
                        name="city"
                        value={instData.city}
                        onChange={handleInstChange}
                        required
                        placeholder="City"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none font-medium"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Students</label>
                    <div className="relative">
                        <User className="absolute left-4 top-3.5 text-slate-400" size={18} />
                        <input
                            name="studentCount"
                            type="number"
                            value={instData.studentCount}
                            onChange={handleInstChange}
                            required
                            placeholder="Count"
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none font-medium"
                        />
                    </div>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Contact</label>
                    <div className="relative">
                        <Phone className="absolute left-4 top-3.5 text-slate-400" size={18} />
                        <input
                            name="contactNumber"
                            type="tel"
                            value={instData.contactNumber}
                            onChange={handleInstChange}
                            required
                            placeholder="Official No."
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none font-medium"
                        />
                    </div>
                </div>
            </div>

            <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Institution Logo (Optional)</label>
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-orange-500 hover:bg-orange-50 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors"
                >
                    {logoFile ? (
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-2 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
                                <img src={URL.createObjectURL(logoFile)} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                            <p className="text-sm font-bold text-slate-700 truncate max-w-[200px]">{logoFile.name}</p>
                            <p className="text-xs text-slate-400">Click to change</p>
                        </div>
                    ) : (
                        <>
                            <Upload className="text-slate-400 mb-2" size={24} />
                            <p className="text-sm font-bold text-slate-600">Upload Logo</p>
                            <p className="text-xs text-slate-400">PNG, JPG up to 2MB</p>
                        </>
                    )}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/*"
                    />
                </div>
            </div>

            <div className="flex gap-3 pt-2">
                <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-6 py-4 rounded-xl border border-slate-200 font-bold text-slate-500 hover:bg-slate-50"
                >
                    Back
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-indigo-950 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-indigo-900 transition-all flex items-center justify-center gap-2"
                >
                    {isSubmitting ? <RefreshCw size={20} className="animate-spin" /> : <>Launch Institution <Building2 size={20} /></>}
                </button>
            </div>
        </form>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-100 p-8 md:p-12 transition-all">
                <div className="mb-8">
                    <h2 className="text-3xl font-black text-slate-900 mb-2">
                        {step === 1 ? `Welcome, ${user.displayName?.split(' ')[0]}!` : (role === 'student' ? 'Student Setup' : 'Institution Setup')}
                        {step === 1 && ' 👋'}
                    </h2>
                    <p className="text-slate-500">
                        {step === 1 ? "Let's personalize your experience." : "Please provide your details below."}
                    </p>
                </div>

                {step === 1 ? renderRoleSelection() : (role === 'student' ? renderStudentForm() : renderInstitutionForm())}
            </div>
        </div>
    );
};

export default OnboardingView;
