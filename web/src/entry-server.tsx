import { renderToString } from 'react-dom/server';
import { createMemoryRouter } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { ApiI18nProvider } from '@/lib/i18n';
import { UserProvider } from '@/hooks/use-user';
import { queryClient } from '@/lib/react-query';
import { DEFAULT_LANGUAGE } from '@/lib/languages';
import { getApiRoutes, RoutedApp, waitForRouter } from './App';

/** Renders one public route to static HTML for the API website bundle. */
export async function render(path: string): Promise<string> {
    const router = createMemoryRouter(getApiRoutes(), { initialEntries: [path] });

    // Resolve lazy public route modules before generating their static markup.
    await waitForRouter(router);

    return renderToString(
        <QueryClientProvider client={queryClient}>
            <UserProvider>
                <ApiI18nProvider language={DEFAULT_LANGUAGE}>
                    <RoutedApp router={router} />
                </ApiI18nProvider>
            </UserProvider>
        </QueryClientProvider>
    );
}
