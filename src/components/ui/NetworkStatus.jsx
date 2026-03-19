import React, { useState, useEffect, useRef } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

/**
 * NetworkStatus Component
 * Shows a subtle banner when the user goes offline.
 * Auto-hides when back online after a brief confirmation.
 */
const NetworkStatus = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [showBanner, setShowBanner] = useState(false);
    const [wasOffline, setWasOffline] = useState(false);
    const hideTimerRef = useRef(null);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            if (wasOffline) {
                // Show "back online" briefly then hide
                setShowBanner(true);
                hideTimerRef.current = setTimeout(() => setShowBanner(false), 3000);
            }
        };

        const handleOffline = () => {
            // Cancel any pending hide timer when going offline again
            clearTimeout(hideTimerRef.current);
            setIsOnline(false);
            setWasOffline(true);
            setShowBanner(true);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            clearTimeout(hideTimerRef.current);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [wasOffline]);

    if (!showBanner) return null;

    return (
        <div
            role="status"
            aria-live="polite"
            style={{
                position: 'fixed',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 99998,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 20px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '600',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                transition: 'all 0.3s ease',
                ...(isOnline
                    ? {
                        backgroundColor: '#f0fdf4',
                        color: '#166534',
                        border: '1px solid #bbf7d0',
                    }
                    : {
                        backgroundColor: '#fef2f2',
                        color: '#991b1b',
                        border: '1px solid #fecaca',
                    }),
            }}
        >
            {isOnline ? (
                <>
                    <Wifi size={18} />
                    <span>Back online — changes synced</span>
                </>
            ) : (
                <>
                    <WifiOff size={18} />
                    <span>You're offline — changes will sync when reconnected</span>
                </>
            )}
        </div>
    );
};

export default NetworkStatus;
