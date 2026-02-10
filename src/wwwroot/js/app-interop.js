window.appInterop = {
    // Theme Management
    theme: {
        apply: (theme) => {
            const root = document.documentElement;
            if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
            // Persist for next load (if not system)
            if (theme !== 'system') {
                localStorage.setItem('theme_preference', theme);
            } else {
                localStorage.removeItem('theme_preference');
            }
        },
        getPreference: () => {
            return localStorage.getItem('theme_preference') || 'system';
        },
        init: (dotNetHelper) => {
            const pref = window.appInterop.theme.getPreference();
            window.appInterop.theme.apply(pref);

            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
                if (window.appInterop.theme.getPreference() === 'system') {
                    window.appInterop.theme.apply('system');
                    dotNetHelper.invokeMethodAsync('OnSystemThemeChanged', e.matches);
                }
            });
        }
    },

    // Network Monitoring
    network: {
        checkConnection: async () => {
            if (!navigator.onLine) return false;
            try {
                // Fetch a small resource with cache busting
                const response = await fetch('css/app.css?_=' + new Date().getTime(), { method: 'HEAD' });
                return response.ok;
            } catch (e) {
                return false;
            }
        },
        init: (dotNetHelper) => {
            const updateStatus = async () => {
                const isConnected = await window.appInterop.network.checkConnection();
                dotNetHelper.invokeMethodAsync('OnConnectionStatusChanged', isConnected);
            };

            window.addEventListener('online', updateStatus);
            window.addEventListener('offline', () => dotNetHelper.invokeMethodAsync('OnConnectionStatusChanged', false));
            
            // Polling every 30s
            setInterval(updateStatus, 30000);
            
            // Initial check
            updateStatus();
        }
    },

    // Settings (LocalStorage Wrapper)
    settings: {
        get: (key) => localStorage.getItem(key),
        set: (key, value) => localStorage.setItem(key, value)
    }
};

// Global Shortcuts for dotNet interop simplicity
window.getSetting = (key) => window.appInterop.settings.get(key);
window.saveSetting = (key, value) => window.appInterop.settings.set(key, value);
