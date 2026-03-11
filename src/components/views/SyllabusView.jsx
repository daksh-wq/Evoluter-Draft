import React from 'react';
import { SYLLABUS_DATA } from '../../constants/data';
import { calculatePercentage } from '../../utils/helpers';
import { db } from '../../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../hooks';

/**
 * SyllabusView Component
 * Tracks progress across different syllabus papers and topics
 */
const SyllabusView = () => {
    const { user } = useAuth();

    // Initialize with 0 progress, ignoring static values
    const [syllabusData, setSyllabusData] = React.useState(() => {
        const initialData = JSON.parse(JSON.stringify(SYLLABUS_DATA));
        Object.keys(initialData).forEach(paper => {
            initialData[paper] = initialData[paper].map(topic => ({
                ...topic,
                completed: 0
            }));
        });
        return initialData;
    });

    React.useEffect(() => {
        if (!user) return;
        const docRef = doc(db, 'users', user.uid, 'syllabus', 'progress');

        const unsubscribe = onSnapshot(docRef, (doc) => {
            // Always merge, even if doc doesn't exist (it will stay 0)
            const progress = doc.exists() ? doc.data() : {};

            setSyllabusData(prevData => {
                const mergedData = { ...prevData };
                Object.keys(mergedData).forEach(paper => {
                    mergedData[paper] = mergedData[paper].map(topic => ({
                        ...topic,
                        completed: progress[topic.id] !== undefined ? progress[topic.id] : 0
                    }));
                });
                return mergedData;
            });
        });

        return () => unsubscribe();
    }, [user]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <header className="border-b border-slate-200 pb-6">
                <h1 className="text-3xl font-extrabold text-indigo-950 tracking-tight">
                    Syllabus Tracker
                </h1>
                <p className="text-slate-500 mt-1">
                    Track your coverage of the UPSC syllabus.
                </p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Object.entries(syllabusData).map(([paper, topics]) => {
                    const totalCompleted = topics.reduce(
                        (acc, t) => acc + t.completed,
                        0
                    );
                    const paperProgress = calculatePercentage(totalCompleted, topics.length * 100);

                    return (
                        <div
                            key={paper}
                            className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col h-full shadow-sm"
                        >
                            <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                                <h3 className="font-bold text-indigo-950">{paper}</h3>
                                <span className="text-xs font-bold bg-white px-2 py-1 rounded border border-slate-200 text-slate-500">
                                    {paperProgress}%
                                </span>
                            </div>
                            <div className="p-4 space-y-4 flex-1">
                                {topics.map((t) => (
                                    <div key={t.id} className="space-y-1.5">
                                        <div className="flex justify-between text-xs font-medium text-slate-700">
                                            <span>{t.topic}</span>
                                            <span>{t.completed}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-[#2278B0] rounded-full"
                                                style={{ width: `${t.completed}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SyllabusView;
