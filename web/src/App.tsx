import { ThemeProvider } from '@/components/theme';
import { RouterProvider, createBrowserRouter } from 'react-router';
import Layout from '@/Layout';

// Import pages
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Profile from '@/pages/Profile';
import Developer from '@/pages/Developer';
import Organizations from '@/pages/Organizations';
import Privacy from '@/pages/Privacy';
import Tos from '@/pages/Tos';
import Impressum from '@/pages/Impressum';

// Organization related pages
import Tools from '@/pages/Tools';
import People from '@/pages/People';
import ViaVai from '@/pages/ViaVai';
import Overview from '@/pages/Overview';
import Workflows from '@/pages/Workflows';
import Solutions from '@/pages/Solutions';

const router = createBrowserRouter([
    { path: '/', element: <Home /> },
    { path: '/login', element: <Login /> },
    { path: '/privacy', element: <Privacy /> },
    { path: '/terms', element: <Tos /> },
    { path: '/impressum', element: <Impressum /> },
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
        path: '/developer',
        element: <Layout />,
        children: [{ index: true, element: <Developer /> }],
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

            // dynamic modules
            {
                path: 'apps/:app/*',
                element: <ViaVai />,
            },
        ],
    },
]);

export default function App() {
    return (
        <ThemeProvider>
            <RouterProvider router={router} />
        </ThemeProvider>
    );
}
