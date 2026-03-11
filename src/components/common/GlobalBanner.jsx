import React, { useEffect, useState } from 'react';
import { db } from '../../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { X, Megaphone } from 'lucide-react';

const GlobalBanner = () => {
    const [config, setConfig] = useState(null);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        // Real-time listener for global config
        const unsub = onSnapshot(doc(db, 'content', 'global_config'), (doc) => {
            if (doc.exists()) {
                setConfig(doc.data());
            }
        });
        return () => unsub();
    }, []);

    if (!config || !config.showBanner || !config.globalBanner || !visible) {
        return null;
    }

    return (
        <div className="bg-indigo-600 text-white px-4 py-3 relative shadow-md z-40">
            <div className="max-w-7xl mx-auto flex items-center justify-center text-sm md:text-base font-medium">
                <Megaphone size={18} className="mr-2 animate-pulse" />
                <span>{config.globalBanner}</span>
            </div>
            <button
                onClick={() => setVisible(false)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Close banner"
            >
                <X size={16} />
            </button>
        </div>
    );
};

export default GlobalBanner;
