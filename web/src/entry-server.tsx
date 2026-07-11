import { UserProvider } from '@/hooks/use-user';
import { ApiI18nProvider } from '@/lib/i18n';
import { DEFAULT_LANGUAGE } from '@/lib/languages';
import { queryClient } from '@/lib/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderToString } from 'react-dom/server';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { getRoutes } from './App';

/** Renders one public route to static HTML for the API website bundle. */
export function render(path: string): string {
    const router = createMemoryRouter(getRoutes('api'), { initialEntries: [path] });

    return renderToString(
        <QueryClientProvider client={queryClient}>
            <UserProvider>
                <ApiI18nProvider language={DEFAULT_LANGUAGE}>
                    <RouterProvider router={router} />
                </ApiI18nProvider>
            </UserProvider>
        </QueryClientProvider>
    );
}
