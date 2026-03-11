import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    collection, addDoc, deleteDoc, doc, orderBy,
    serverTimestamp, onSnapshot, query
} from 'firebase/firestore';
import { db, storage } from '../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuthContext } from './AuthContext';
import logger from '../utils/logger';
import { handleError, ErrorSeverity, ErrorCategory } from '../utils/errorHandler';

/**
 * LibraryContext
 * Manages document/library state and operations
 */
const LibraryContext = createContext(null);

export const useLibraryContext = () => {
    const context = useContext(LibraryContext);
    if (!context) {
        throw new Error('useLibraryContext must be used within LibraryProvider');
    }
    return context;
};

export const LibraryProvider = ({ children }) => {
    const { user } = useAuthContext();
    const [docs, setDocs] = useState([]);
    const [uploadingDoc, setUploadingDoc] = useState(false);

    // Real-time docs listener
    useEffect(() => {
        let unsubscribe = () => { };

        if (user?.uid) {
            try {
                const q = query(
                    collection(db, 'users', user.uid, 'docs'),
                    orderBy('uploadDate', 'desc')
                );
                unsubscribe = onSnapshot(q, (snapshot) => {
                    const fetchedDocs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                    setDocs(fetchedDocs);
                }, (error) => {
                    logger.error('Error fetching docs real-time:', error);
                });
            } catch (error) {
                logger.error('Error setting up doc listener:', error);
            }
        }
        return () => unsubscribe();
    }, [user?.uid]);

    const handleFileUpload = useCallback(async (file) => {
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
            logger.info('Document uploaded successfully', { docId: docRef.id });
        } catch (error) {
            handleError(error, 'Upload failed. Please try again.', ErrorSeverity.USER_FACING, ErrorCategory.STORAGE);
        } finally {
            setUploadingDoc(false);
        }
    }, [user]);

    const handleDeleteDoc = useCallback(async (docId) => {
        if (!user || !confirm('Are you sure you want to delete this document?')) return;
        try {
            await deleteDoc(doc(db, 'users', user.uid, 'docs', docId));
            setDocs(prev => prev.filter(d => d.id !== docId));
            logger.info('Document deleted', { docId });
        } catch (error) {
            handleError(error, 'Failed to delete document.', ErrorSeverity.USER_FACING, ErrorCategory.DATABASE);
        }
    }, [user]);

    const value = {
        docs,
        uploadingDoc,
        handleFileUpload,
        handleDeleteDoc,
    };

    return (
        <LibraryContext.Provider value={value}>
            {children}
        </LibraryContext.Provider>
    );
};

export default LibraryContext;
