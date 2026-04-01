import { Toaster } from '@/ui/sonner';
import { ThemeProvider } from '@/components/theme';
import { RouterProvider, createBrowserRouter } from 'react-router';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import Layout from './Layout';
import { RequireAuth } from '@/components/Auth';
import Login from '@/pages/user/Login';
import NotFound from '@/pages/NotFound';
import Longlink from './Longlink';

const router = createBrowserRouter([
    {
        path: '/',
        element: (
            <RequireAuth>
                <Layout />
            </RequireAuth>
        ),
        children: [
            { index: true, element: <Longlink /> },
            { path: '*', element: <Longlink /> },
        ],
    },
    { path: '/login', element: <Login /> },
    {
        path: '*',
        element: (
            <RequireAuth>
                <NotFound />
            </RequireAuth>
        ),
    },
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
