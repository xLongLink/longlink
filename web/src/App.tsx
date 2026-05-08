import { RequireAuth } from '@/components/Auth';
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
        { path: '/', element: <Index /> },
        { path: ':org', element: withAuth(<LongLink path="/api/:org/metadata.json" />) },
        { path: ':org/:app/*', element: withAuth(<LongLink path="/api/:org/:app/metadata.json" />) },
        { path: '/login', element: <Login /> },
        { path: '*', element: withAuth(<NotFound />) },
    ];
}

const router = createBrowserRouter(getRoutes());

/**
 * Renders the app shell, router, and global toaster.
 */
export default function App() {
    return (
        <>
            <RouterProvider router={router} />
            <Toaster position="bottom-right" />
        </>
    );
}
