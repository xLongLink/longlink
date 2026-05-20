import { RequireAuth } from '@/components/Auth';
import { Toaster } from '@ui/sonner';
import { RouterProvider, createBrowserRouter } from 'react-router';
import Layout from './Layout';
import Home from './pages/Home';
import Impressum from './pages/Impressum';
import NotFound from './pages/NotFound';
import Playground from './pages/Playground';
import Pricing from './pages/Pricing';
import Privacy from './pages/Privacy';
import Sample from './pages/Sample';
import Terms from './pages/Terms';
import View from './pages/View';

/**
 * Builds the route tree for the current bundle mode.
 */
function getRoutes() {
    // SDK bundle serves the app runtime without control-plane routes.
    if (import.meta.env.MODE === 'sdk') {
        return [{ path: '/', element: <View metadata="/metadata.json" baseurl="" /> }];
    }

    // Default bundle serves the full app with control-plane routes.
    return [
        { path: '/', element: <Home /> },
        {
            path: 'playground',
            element: (
                <Layout>
                    <Playground />
                </Layout>
            ),
        },
        { path: 'sample', element: <Sample /> },
        { path: 'pricing', element: <Pricing /> },
        {
            path: 'impressum',
            element: (
                <Layout>
                    <Impressum />
                </Layout>
            ),
        },
        {
            path: 'terms',
            element: (
                <Layout>
                    <Terms />
                </Layout>
            ),
        },
        {
            path: 'privacy',
            element: (
                <Layout>
                    <Privacy />
                </Layout>
            ),
        },
        {
            path: ':org',
            element: (
                <RequireAuth>
                    <View metadata="/api/:org/metadata.json" baseurl="/api" />
                </RequireAuth>
            ),
        },
        {
            path: ':org/:app/*',
            element: (
                <RequireAuth>
                    <View metadata="/api/:org/:app/metadata.json" baseurl="/api/apps/:app" />
                </RequireAuth>
            ),
        },
        {
            path: '*',
            element: (
                <RequireAuth>
                    <NotFound />
                </RequireAuth>
            ),
        },
    ];
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
