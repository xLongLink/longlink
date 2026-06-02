import { UserProvider } from '@/hooks/use-user';
import '@/index.css';
import { queryClient } from '@/lib/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

/** Renders the bundle-specific app shell. */
function AppShell() {
    // SDK mode does not need authenticated user state or the user-aware toaster.
    if (import.meta.env.MODE === 'sdk') {
        return <App />;
    }

    return (
        <UserProvider>
            <App />
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
