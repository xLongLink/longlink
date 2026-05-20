import { ThemeProvider } from '@/components/Theme';
import { UserPreferencesSync, UserProvider, useUser } from '@/hooks/use-user';
import '@/index.css';
import { queryClient } from '@/lib/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

/** Wraps the app in auth-aware theme and preference providers. */
function AppShell() {
    const { data: user } = useUser();

    return (
        <ThemeProvider defaultTheme="dark" theme={user?.theme}>
            <UserPreferencesSync />
            <App />
        </ThemeProvider>
    );
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <UserProvider>
                <AppShell />
            </UserProvider>
        </QueryClientProvider>
    </StrictMode>
);
