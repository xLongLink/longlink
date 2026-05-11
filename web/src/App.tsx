import { RequireAuth } from '@/components/Auth';
import { Toaster } from '@ui/sonner';
import { RouterProvider, createBrowserRouter } from 'react-router';
import Home from './pages/Home';
import LongLink from './pages/Longlink';
import NotFound from './pages/NotFound';

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
