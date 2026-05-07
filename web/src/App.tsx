import { RequireAuth } from '@/components/Auth';
import { Toaster } from '@/ui/sonner';
import type { ReactElement } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router';
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
            { index: true, element: <OrganizationPage page="applications" /> },
            { path: ':org', element: <OrganizationPage page="applications" /> },
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
            <RouterProvider router={router} />
            <Toaster position="bottom-right" />
        </>
    );
}
