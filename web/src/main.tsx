import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';

import '@/index.css';
import App from './App';
import { queryClient } from '@/lib/react-query';
import { ThemeProvider } from '@/components/theme';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <ThemeProvider defaultTheme="dark" storageKey="longlink-ui-theme">
                <App />
            </ThemeProvider>
        </QueryClientProvider>
    </StrictMode>
);
