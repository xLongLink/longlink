import { SdkUserProvider } from '@/hooks/use-sdk-user';
import { UserProvider, useUserProfile } from '@/hooks/use-user';
import '@/index.css';
import { ApiI18nProvider } from '@/lib/i18n';
import { DEFAULT_LANGUAGE } from '@/lib/languages';
import { queryClient } from '@/lib/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

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
    // SDK mode uses deterministic local users instead of control-plane authentication.
    if (import.meta.env.MODE === 'sdk') {
        return (
            <ApiI18nProvider language={DEFAULT_LANGUAGE}>
                <SdkUserProvider>
                    <App />
                </SdkUserProvider>
            </ApiI18nProvider>
        );
    }

    return (
        <UserProvider>
            <ApiAppShell />
        </UserProvider>
    );
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <AppShell />
        </QueryClientProvider>
    </StrictMode>
);
