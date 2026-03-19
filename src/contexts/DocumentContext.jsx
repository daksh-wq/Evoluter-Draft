import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../services/firebase';
import { useAuth } from '../hooks';
import logger from '../utils/logger';
import { handleError, ErrorSeverity, ErrorCategory } from '../utils/errorHandler';

/**
 * DocumentContext
 * Manages user documents and uploading state to isolate re-renders from App.jsx
 */
const DocumentContext = createContext(null);

export const useDocumentContext = () => {
    const context = useContext(DocumentContext);
    if (!context) {
        throw new Error('useDocumentContext must be used within DocumentProvider');
    }
    return context;
};

export const DocumentProvider = ({ children }) => {
    const { user } = useAuth();
    const [docs, setDocs] = useState([]);
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [docToDelete, setDocToDelete] = useState(null);

    // Fetch Docs when User ID available (Real-time)
    useEffect(() => {
        let unsubscribe = () => { };

        if (user?.uid) {
            try {
                const q = query(
                    collection(db, 'users', user.uid, 'docs'),
                    orderBy('uploadDate', 'desc')
                    // Note: Could add limit(20) here for further optimization if list grows large
                );
                unsubscribe = onSnapshot(q, (snapshot) => {
                    const fetchedDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setDocs(fetchedDocs);
                }, (error) => {
                    logger.error("Error fetching docs real-time:", error);
                });
            } catch (error) {
                logger.error("Error setting up doc listener:", error);
            }
        }
        return () => {
            unsubscribe();
        };
    }, [user]);

    const handleFileUpload = async (file) => {
        if (!user) return;
        setUploadingDoc(true);

        try {
            const storageRef = ref(storage, `users/${user.uid}/docs/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            const newDocData = {
                title: file.name,
                type: file.name.split('.').pop().toUpperCase(),
                size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
                uploadDate: serverTimestamp(),
                category: 'Uploads',
                tags: ['User', 'PDF'],
                url: downloadURL,
                storagePath: snapshot.metadata.fullPath,
                processed: true
            };

            const docRef = await addDoc(collection(db, 'users', user.uid, 'docs'), newDocData);
            const optimisticDoc = { id: docRef.id, ...newDocData, uploadDate: { toDate: () => new Date() } };
            setDocs(prev => [optimisticDoc, ...prev]);
            logger.info('Document uploaded', { docId: docRef.id });
        } catch (error) {
            handleError(error, 'Upload failed. Please try again.', ErrorSeverity.USER_FACING, ErrorCategory.STORAGE);
        } finally {
            setUploadingDoc(false);
        }
    };

    const handleDeleteDoc = useCallback((docId) => {
        if (!user) return;
        setDocToDelete(docId);
    }, [user]);

    const confirmDeleteDoc = useCallback(async () => {
        if (!user || !docToDelete) return;
        try {
            await deleteDoc(doc(db, 'users', user.uid, 'docs', docToDelete));
            setDocs(prev => prev.filter(d => d.id !== docToDelete));
            logger.info('Document deleted', { docId: docToDelete });
        } catch (error) {
            handleError(error, 'Failed to delete document.', ErrorSeverity.USER_FACING, ErrorCategory.DATABASE);
        } finally {
            setDocToDelete(null);
        }
    }, [user, docToDelete]);

    const cancelDeleteDoc = useCallback(() => {
        setDocToDelete(null);
    }, []);

    const value = {
        docs,
        uploadingDoc,
        docToDelete,
        handleFileUpload,
        handleDeleteDoc,
        confirmDeleteDoc,
        cancelDeleteDoc,
    };

    return (
        <DocumentContext.Provider value={value}>
            {children}
            {/* Delete Document Confirmation Modal */}
            {docToDelete && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-sm p-6">
                        <h3 className="text-xl font-black text-slate-800 text-center mb-2">Delete Document?</h3>
                        <p className="text-sm text-slate-500 text-center mb-6">This action cannot be undone.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={cancelDeleteDoc}
                                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteDoc}
                                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-all"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DocumentContext.Provider>
    );
};

export default DocumentContext;
