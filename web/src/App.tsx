import type { ReactElement } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/theme';
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router';
import Layout from '@/Layout';
import { RequireAuth } from '@/components/Auth';

// Import pages
import Login from '@/pages/user/Login';
import Profile from '@/pages/user/Profile';
import NotFound from '@/pages/NotFound';

// Organization related pages
import People from '@/pages/org/People';
import SettingsPage from '@/pages/org/Settings';
import Apps from '@/pages/org/Apps';
import ViaVai from '@/pages/org/ViaVai';

const withAuth = (element: ReactElement) => (
    <RequireAuth>{element}</RequireAuth>
);

const router = createBrowserRouter([
    {
        path: '/',
        element: withAuth(<Layout />),
        children: [
            { index: true, element: <Navigate to="/apps" replace /> },
            { path: 'apps', element: <Apps /> },
            { path: 'people', element: <People /> },
            { path: 'settings', element: <SettingsPage /> },
            { path: 'viavai', element: <ViaVai /> },
            {
                path: 'apps/:app/*',
                element: <ViaVai />,
            },
        ],
    },
    { path: '/login', element: <Login /> },
    {
        path: '/profile',
        element: withAuth(<Layout />),
        children: [{ index: true, element: <Profile /> }],
    },
    {
        path: '/organizations',
        element: withAuth(<Navigate to="/" replace />),
    },
    {
        path: '/organization',
        element: withAuth(<Navigate to="/" replace />),
    },
    {
        path: '/viavai',
        element: withAuth(<Layout />),
        children: [{ index: true, element: <ViaVai /> }],
    },
    { path: '*', element: withAuth(<NotFound />) },
]);

export default function App() {
    return (
        <ThemeProvider>
            <RouterProvider router={router} />
            <Toaster />
        </ThemeProvider>
    );
}
