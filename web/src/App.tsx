import type { ReactElement } from 'react';
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { Toaster } from '@/ui/sonner';
import Layout from './Layout';
import Longlink from './pages/org/Longlink';
import OrganizationPage from './pages/org/OrganizationPage';
import Login from './pages/user/Login';
import NotFound from './pages/NotFound';
import SdkLayout from './sdk/Layout';
import SdkLonglink from './sdk/Longlink';
import { RequireAuth } from '@/components/Auth';

const buildMode = import.meta.env.MODE;

const isSdkBuild = buildMode === 'sdk';
const isDevelopment = buildMode === 'development';

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
 * Wraps route element with auth guard.
 */
const withAuth = (element: ReactElement) => <RequireAuth>{element}</RequireAuth>;

const sdkRoutes = [
    {
        path: '/',
        element: <SdkLayout />,
        children: [{ path: '*', element: <SdkLonglink /> }],
    },
];

const apiRoutes = [
    {
        path: '/',
        element: withAuth(<Layout />),
        children: [
            { index: true, element: <Navigate to="/overview" replace /> },
            { path: 'overview', element: <OrganizationPage page="overview" /> },
            { path: 'applications', element: <OrganizationPage page="applications" /> },
            { path: 'people', element: <OrganizationPage page="people" /> },
            { path: 'settings', element: <OrganizationPage page="settings" /> },
            {
                path: ':appId/*',
                element: <Longlink />,
            },
        ],
    },
    { path: '/login', element: <Login /> },
    {
        path: '/profile',
        element: withAuth(<Layout />),
        children: [{ index: true, element: <OrganizationPage page="profile" /> }],
    },
    { path: '*', element: withAuth(<NotFound />) },
];

/**
 * Builds route tree based on bundle mode.
 */
function getRoutes() {
    // SDK bundle serves app from root without control-plane auth routes.
    if (isSdkBuild) {
        return sdkRoutes;
    }

    // Dev bundle exposes both trees so SDK path and API path work together.
    if (isDevelopment) {
        return [
            {
                path: '/sdk',
                element: <SdkLayout />,
                children: [{ path: '*', element: <SdkLonglink /> }],
            },
            ...apiRoutes,
        ];
    }

    return apiRoutes;
}

const router = createBrowserRouter(getRoutes());

/**
 * Renders app shell, router, global toaster.
 */
export default function App() {
    return (
        <>
            <GlobalLoader />
            <RouterProvider router={router} />
            <Toaster />
        </>
    );
}
