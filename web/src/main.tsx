import { StrictMode } from 'react';
import '@/index.css';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ApiI18nProvider } from '@/lib/i18n';
import { queryClient } from '@/lib/react-query';
import { DEFAULT_LANGUAGE } from '@/lib/languages';
import { UserProvider, useUserProfile } from '@/hooks/use-user';
import App, { initializeApp } from './App';

/** Applies API-mode translations from the authenticated user preferences. */
function ApiAppShell() {
    const { language } = useUserProfile();

    return (
        <ApiI18nProvider language={language}>
            <App />
        </ApiI18nProvider>
    );
}

/** Renders the bundle-specific app shell. */
function AppShell() {
    // SDK mode renders the local app shell; authentication is owned by the LongLink Platform.
    if (import.meta.env.MODE === 'sdk') {
        return (
            <ApiI18nProvider language={DEFAULT_LANGUAGE}>
                <App />
            </ApiI18nProvider>
        );
    }

    return (
        <UserProvider>
            <ApiAppShell />
        </UserProvider>
    );
}

const root = document.getElementById('root');
if (!root) {
    throw new Error('Application root is missing');
}

// Compare normalized paths while preserving the server's canonical document URL.
const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
const rawPrerenderPath = root.dataset.prerenderPath;
const prerenderPath = rawPrerenderPath === undefined ? null : rawPrerenderPath.replace(/\/+$/, '') || '/';
const shouldHydrate = prerenderPath === currentPath;

const app = (
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <AppShell />
        </QueryClientProvider>
    </StrictMode>
);

// Resolve lazy routes before hydration; ordinary SPA mounts can render their loading state immediately.
if (shouldHydrate) {
    await initializeApp();
    hydrateRoot(root, app);
} else {
    createRoot(root).render(app);
}
