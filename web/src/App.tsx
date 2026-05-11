import { RequireAuth } from '@/components/Auth';
import { Toaster } from '@ui/sonner';
import { RouterProvider, createBrowserRouter } from 'react-router';
import Layout from './Layout';
import Features from './pages/Features';
import Home from './pages/Home';
import Impressum from './pages/Impressum';
import LongLink from './pages/Longlink';
import NotFound from './pages/NotFound';
import Pricing from './pages/Pricing';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';

/**
 * Builds the route tree for the current bundle mode.
 */
function getRoutes() {
    // SDK bundle serves the app runtime without control-plane routes.
    if (import.meta.env.MODE === 'sdk') {
        return [{ path: '/', element: <LongLink path="/metadata.json" /> }];
    }

    // Default bundle serves the full app with control-plane routes.
    return [
        { path: '/', element: <Home /> },
        { path: 'features', element: <Features /> },
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
                    <LongLink path="/api/:org/metadata.json" />
                </RequireAuth>
            ),
        },
        {
            path: ':org/:app/*',
            element: (
                <RequireAuth>
                    <LongLink path="/api/:org/:app/metadata.json" />
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
