import { useEffect } from 'react';
import toast from 'react-hot-toast';

const NETWORK_TOAST_ID = 'network-status';

const ConnectivityToast = () => {
    useEffect(() => {
        const showOfflineToast = () => {
            toast.error('You are offline. Reconnect to continue.', {
                id: NETWORK_TOAST_ID,
                duration: Infinity,
            });
        };

        const showOnlineToast = () => {
            toast.success('Back online.', {
                id: NETWORK_TOAST_ID,
                duration: 2000,
            });
        };

        if (!navigator.onLine) {
            showOfflineToast();
        }

        window.addEventListener('offline', showOfflineToast);
        window.addEventListener('online', showOnlineToast);

        return () => {
            window.removeEventListener('offline', showOfflineToast);
            window.removeEventListener('online', showOnlineToast);
        };
    }, []);

    return null;
};

export default ConnectivityToast;
