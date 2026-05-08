import { RequireAuth } from '@/components/Auth';
import { BaseUrlContext } from '@/hooks/use-url';
import { getApiBaseUrl } from '@/lib/api';
import { Toaster } from '@/ui/sonner';
import type { ReactElement } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router';
import Index from './pages/Index';
import Login from './pages/Login';
import LongLink from './pages/Longlink';
import NotFound from './pages/NotFound';

/**
 * Builds the route tree for the current bundle mode.
 */
function getRoutes() {
    const withAuth = (element: ReactElement) => <RequireAuth>{element}</RequireAuth>;

    // SDK bundle serves the app runtime without control-plane routes.
    if (import.meta.env.MODE === 'sdk') {
        return [{ path: '/', element: <LongLink path="/metadata.json" /> }];
    }

    // Default bundle serves the full app with control-plane routes.
    return [
        {
            path: '/',
            children: [
                { index: true, element: <Index /> },
                { path: ':org', element: withAuth(<LongLink path="/api/:org/metadata.json" />) },
                {
                    path: ':org/:application/*',
                    element: withAuth(<LongLink path="/api/:org/:application/metadata.json" />),
                },
            ],
        },
        { path: '/login', element: <Login /> },
        { path: '*', element: withAuth(<NotFound />) },
    ];
}

const router = createBrowserRouter(getRoutes());

/**
 * Renders the app shell, router, and global toaster.
 */
export default function App() {
    const baseUrl = getApiBaseUrl();

    return (
        <BaseUrlContext.Provider value={baseUrl}>
            <RouterProvider router={router} />
            <Toaster position="bottom-right" />
        </BaseUrlContext.Provider>
    );
}
