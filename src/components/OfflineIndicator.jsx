import { useEffect, useState } from 'react';

function getOnlineStatus() {
    if (typeof navigator === 'undefined') {
        return true;
    }

    return navigator.onLine;
}

export default function OfflineIndicator() {
    const [isOnline, setIsOnline] = useState(getOnlineStatus);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (isOnline) return null;

    return (
        <div className="pointer-events-none fixed bottom-4 left-4 z-30 rounded-md border border-yellow-300 bg-yellow-100 px-4 py-2 text-sm text-yellow-800 shadow-sm">
            Offline: changes will sync when reconnected.
        </div>
    );
}
