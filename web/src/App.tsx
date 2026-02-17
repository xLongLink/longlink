import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/theme';
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router';
import Layout from '@/Layout';
import { RequireAuth } from '@/components/Auth';

// Import pages
import Login from '@/pages/user/Login';
import Profile from '@/pages/user/Profile';
import Organizations from '@/pages/user/Organizations';
import ViaVai from '@/pages/user/ViaVai';
import NotFound from '@/pages/NotFound';

// Organization related pages
import Tools from '@/pages/org/Tools';
import People from '@/pages/org/People';
import Overview from '@/pages/org/Overview';
import Workflows from '@/pages/org/Workflows';
import Solutions from '@/pages/org/Solutions';
import SettingsPage from '@/pages/org/Settings';

const router = createBrowserRouter([
    {
        path: '/',
        element: (
            <RequireAuth>
                <Layout />
            </RequireAuth>
        ),
        children: [{ index: true, element: <Organizations /> }],
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
    {
        path: '/:country/:org',
        element: <Layout />,
        children: [
            { index: true, element: <Overview /> },
            { path: 'tools', element: <Tools /> },
            { path: 'people', element: <People /> },
            { path: 'solutions', element: <Solutions /> },
            { path: 'workflows', element: <Workflows /> },
            { path: 'settings', element: <SettingsPage /> },

            // dynamic modules
            {
                path: 'apps/:app/*',
                element: <ViaVai />,
            },
        ],
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
