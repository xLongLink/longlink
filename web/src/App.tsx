import { ThemeProvider } from '@/components/theme';
import { RouterProvider, createBrowserRouter } from 'react-router';
import Layout from '@/Layout';

// Import pages
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Tools from '@/pages/Tools';
import People from '@/pages/People';
import ViaVai from '@/pages/ViaVai';
import Overview from '@/pages/Overview';
import Workflows from '@/pages/Workflows';
import Solutions from '@/pages/Solutions';
import Settings from '@/pages/Settings';

const router = createBrowserRouter([
    { path: '/', element: <Home /> },
    { path: '/login', element: <Login /> },
    { path: '/settings', element: <Settings /> },

    {
        path: '/:org',
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
