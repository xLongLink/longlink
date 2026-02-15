import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/theme';
import { RouterProvider, createBrowserRouter } from 'react-router';
import Layout from '@/Layout';

// Import pages
import Home from '@/pages/home/Home';
import Login from '@/pages/user/Login';
import Profile from '@/pages/user/Profile';
import Organizations from '@/pages/user/Organizations';
import Privacy from '@/pages/home/Privacy';
import Tos from '@/pages/home/Tos';
import Impressum from '@/pages/home/Impressum';
import NotFound from '@/pages/NotFound';

// Organization related pages
import Tools from '@/pages/org/Tools';
import People from '@/pages/org/People';
import OrgViaVai from '@/pages/org/ViaVai';
import Overview from '@/pages/org/Overview';
import Workflows from '@/pages/org/Workflows';
import Solutions from '@/pages/org/Solutions';
import SettingsPage from '@/pages/org/Settings';

const router = createBrowserRouter([
    { path: '/', element: <Home /> },
    { path: '/home', element: <Home /> },
    { path: '/login', element: <Login /> },
    { path: '/home/privacy', element: <Privacy /> },
    { path: '/home/tos', element: <Tos /> },
    { path: '/home/impressum', element: <Impressum /> },
    {
        path: '/profile',
        element: <Layout />,
        children: [{ index: true, element: <Profile /> }],
    },
    {
        path: '/organizations',
        element: <Layout />,
        children: [{ index: true, element: <Organizations /> }],
    },
    {
        path: '/viavai',
        element: <Layout />,
        children: [{ index: true, element: <OrgViaVai /> }],
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
                element: <OrgViaVai />,
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
