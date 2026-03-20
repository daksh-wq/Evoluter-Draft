import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { batchService } from '../features/exam-engine/services/batchService';

export const useNotifications = (userData) => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchNotificationsData = useCallback(async () => {
        const hasBatches = userData?.enrolledBatches && userData.enrolledBatches.length > 0;
        const hasInstitutions = userData?.joinedInstitutions && userData.joinedInstitutions.length > 0;

        if (!hasBatches && !hasInstitutions) {
            setNotifications([]);
            setLoading(false);
            return;
        }

        try {
            const allTestDocs = [];

            if (hasBatches) {
                const batchIds = userData.enrolledBatches;
                const chunks = [];
                for (let i = 0; i < batchIds.length; i += 10) {
                    chunks.push(batchIds.slice(i, i + 10));
                }

                for (const chunk of chunks) {
                    const q = query(
                        collection(db, 'institution_tests'),
                        where('assignedBatchIds', 'array-contains-any', chunk)
                    );
                    const snap = await getDocs(q);
                    snap.docs.forEach(d => {
                        if (!allTestDocs.find(t => t.id === d.id)) {
                            allTestDocs.push({ id: d.id, ...d.data() });
                        }
                    });
                }
            }

            const now = new Date();
            const activeTests = allTestDocs.filter(t => {
                if (t.status === 'archived' || t.status === 'inactive') return false;

                if (!t.isScheduled || (!t.scheduledStart && !t.scheduledEnd)) return true;

                const start = t.scheduledStart?.toDate ? t.scheduledStart.toDate() : (t.scheduledStart ? new Date(t.scheduledStart) : null);
                const end = t.scheduledEnd?.toDate ? t.scheduledEnd.toDate() : (t.scheduledEnd ? new Date(t.scheduledEnd) : null);

                // Count if it's Live or Upcoming
                if (end && now > end) return false; // ended
                return true;
            });

            let fetchedBatches = [];
            let fetchedInstitutions = [];

            try {
                const myBatches = await batchService.getStudentBatches(userData.uid);
                fetchedBatches = myBatches || [];
            } catch (batchErr) {
                console.error("Failed to fetch batches for notifications", batchErr);
            }

            if (userData.joinedInstitutions && userData.joinedInstitutions.length > 0) {
                try {
                    const instPromises = userData.joinedInstitutions.map(async (instId) => {
                        const instRef = doc(db, 'users', instId);
                        const instSnap = await getDoc(instRef);
                        if (instSnap.exists()) {
                            return {
                                id: instId,
                                name: instSnap.data().displayName || instSnap.data().name || 'Institution'
                            };
                        }
                        return null;
                    });
                    const results = await Promise.all(instPromises);
                    fetchedInstitutions = results.filter(i => i !== null);
                } catch (instErr) {
                    console.error("Failed to fetch institutions for notifications", instErr);
                }
            }

            const combined = [
                ...activeTests.map(t => ({
                    type: 'test',
                    id: `test-${t.id}`,
                    data: t,
                    timestamp: t.createdAt?.seconds ? t.createdAt.seconds * 1000 : Date.now()
                })),
                ...fetchedBatches.map(b => ({
                    type: 'batch',
                    id: `batch-${b.id}`,
                    data: b,
                    timestamp: b.joinedAt?.seconds ? b.joinedAt.seconds * 1000 : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : Date.now())
                })),
                ...fetchedInstitutions.map(inst => ({
                    type: 'institution',
                    id: `inst-${inst.id}`,
                    data: inst,
                    timestamp: Date.now()
                }))
            ];

            combined.sort((a, b) => b.timestamp - a.timestamp);

            const key = `viewed_notifications_${userData.uid}`;
            const viewed = JSON.parse(localStorage.getItem(key) || '[]');
            
            combined.forEach(n => {
                n.isViewed = viewed.includes(n.id);
            });

            setNotifications(combined);
        } catch (error) {
            console.error("Failed to fetch notifications data:", error);
        } finally {
            setLoading(false);
        }
    }, [userData?.enrolledBatches, userData?.joinedInstitutions, userData?.uid]);

    useEffect(() => {
        if (userData?.uid) {
            fetchNotificationsData();
        } else {
            setLoading(false);
        }
    }, [userData?.uid, fetchNotificationsData]);

    const markAsViewed = useCallback((itemId) => {
        if (!userData?.uid) return;
        const key = `viewed_notifications_${userData.uid}`;
        const viewed = JSON.parse(localStorage.getItem(key) || '[]');
        if (!viewed.includes(itemId)) {
            viewed.push(itemId);
            localStorage.setItem(key, JSON.stringify(viewed));
        }
        setNotifications(prev => prev.map(n => n.id === itemId ? { ...n, isViewed: true } : n));
    }, [userData?.uid]);

    return { notifications, loading, markAsViewed, refresh: fetchNotificationsData };
};
