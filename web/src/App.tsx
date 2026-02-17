import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/theme';
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router';
import Layout from '@/Layout';
import { RequireAuth } from '@/components/Auth';

// Import pages
import Login from '@/pages/user/Login';
import Profile from '@/pages/user/Profile';
import ViaVai from '@/pages/user/ViaVai';
import NotFound from '@/pages/NotFound';

// Organization related pages
import People from '@/pages/org/People';
import SettingsPage from '@/pages/org/Settings';
import Apps from '@/pages/org/Apps';

const router = createBrowserRouter([
    {
        path: '/',
        element: (
            <RequireAuth>
                <Layout />
            </RequireAuth>
        ),
        children: [
            { index: true, element: <Navigate to="/apps" replace /> },
            { path: 'apps', element: <Apps /> },
            { path: 'people', element: <People /> },
            { path: 'settings', element: <SettingsPage /> },
            {
                path: 'apps/:app/*',
                element: <ViaVai />,
            },
        ],
    },
    { path: '/login', element: <Login /> },
    {
        path: '/profile',
        element: (
            <RequireAuth>
                <Layout />
            </RequireAuth>
        ),
        children: [{ index: true, element: <Profile /> }],
    },
    {
        path: '/organizations',
        element: <Navigate to="/" replace />,
    },
    {
        path: '/organization',
        element: <Navigate to="/" replace />,
    },
    {
        path: '/home',
        element: <Navigate to="/" replace />,
    },
    {
        path: '/home/privacy',
        element: <Navigate to="/" replace />,
    },
    {
        path: '/home/tos',
        element: <Navigate to="/" replace />,
    },
    {
        path: '/home/impressum',
        element: <Navigate to="/" replace />,
    },
    {
        path: '/viavai',
        element: (
            <RequireAuth>
                <Layout />
            </RequireAuth>
        ),
        children: [{ index: true, element: <ViaVai /> }],
    },
    { path: '*', element: <NotFound /> },
]);

export default function App() {
    return (
        <ThemeProvider>
            <RouterProvider router={router} />
            <Toaster />
        </ThemeProvider>
    );
}
