import { RequireAuth } from '@/components/Auth';
import { Toaster } from '@/ui/sonner';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router';
import Layout from './Layout';
import Login from './pages/Login';
import LongLink from './pages/Longlink';
import NotFound from './pages/NotFound';
import OrganizationPage from './pages/OrganizationPage';
import SdkLayout from './sdk/Layout';
import SdkLongLink from './sdk/Longlink';

const buildMode = import.meta.env.MODE;

const isSdkBuild = buildMode === 'sdk';

/**
 * Renders a top-level loading indicator while React Query is busy.
 */
function GlobalLoader() {
    const isFetching = useIsFetching();
    const isMutating = useIsMutating();
    const isLoading = isFetching > 0 || isMutating > 0;

    if (!isLoading) {
        return null;
    }

    return (
        <div className="fixed left-0 top-0 z-50 h-1 w-full overflow-hidden bg-transparent">
            <div className="h-full w-full animate-pulse bg-blue-500/80" />
        </div>
    );
}

/**
 * Wraps a route element with the auth guard.
 */
const withAuth = (element: ReactElement) => <RequireAuth>{element}</RequireAuth>;

const sdkRoutes = [
    {
        path: '/',
        element: <SdkLayout />,
        children: [{ path: '*', element: <SdkLongLink /> }],
    },
];

const apiRoutes = [
    {
        path: '/',
        element: withAuth(<Layout />),
        children: [
            { index: true, element: <Navigate to="/applications" replace /> },
            { path: 'applications', element: <OrganizationPage page="applications" /> },
            { path: 'settings', element: <OrganizationPage page="settings" /> },
            { path: 'example', element: <OrganizationPage page="example" /> },
            {
                path: 'applications/:appId/*',
                element: <LongLink />,
            },
        ],
    },
    { path: '/login', element: <Login /> },
    { path: '*', element: withAuth(<NotFound />) },
];

/**
 * Builds the route tree for the current bundle mode.
 */
function getRoutes() {
    /* SDK bundle serves the app runtime without control-plane routes. */
    // SDK bundle serves app from root without control-plane auth routes.
    if (isSdkBuild) {
        return sdkRoutes;
    }

    return apiRoutes;
}

const router = createBrowserRouter(getRoutes());

/**
 * Renders the app shell, router, and global toaster.
 */
export default function App() {
    return (
        <>
            <GlobalLoader />
            <RouterProvider router={router} />
            <Toaster position="bottom-right" />
        </>
    );
}
