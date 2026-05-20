import { ThemeProvider } from '@/components/Theme';
import { UserPreferencesSync } from '@/hooks/use-user';
import '@/index.css';
import { queryClient } from '@/lib/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <ThemeProvider defaultTheme="dark" storageKey="longlink-ui-theme">
                <UserPreferencesSync />
                <App />
            </ThemeProvider>
        </QueryClientProvider>
    </StrictMode>
);
