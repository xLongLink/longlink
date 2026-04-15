import type { ReactElement } from 'react';
import { Toaster } from '@/ui/sonner';
import { ThemeProvider } from '@/components/theme';
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import Layout from './Layout';
import { RequireAuth } from '@/components/Auth';

// Import pages
import Login from '@/pages/user/Login';
import Profile from '@/pages/user/Profile';
import NotFound from '@/pages/NotFound';

import Longlink from '@/pages/org/Longlink';
import OrganizationPage from '@/pages/org/OrganizationPage';

const withAuth = (element: ReactElement) => <RequireAuth>{element}</RequireAuth>;

const router = createBrowserRouter([
    {
        path: '/',
        element: withAuth(<Layout />),
        children: [
            { index: true, element: <Navigate to="/overview" replace /> },
            { path: 'overview', element: <OrganizationPage page="overview" /> },
            { path: 'tools', element: <OrganizationPage page="tools" /> },
            { path: 'spaces', element: <OrganizationPage page="spaces" /> },
            { path: 'processes', element: <OrganizationPage page="processes" /> },
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
        children: [{ index: true, element: <Profile /> }],
    },
    { path: '*', element: withAuth(<NotFound />) },
]);

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

export default function App() {
    return (
        <ThemeProvider>
            <GlobalLoader />
            <RouterProvider router={router} />
            <Toaster />
        </ThemeProvider>
    );
}
