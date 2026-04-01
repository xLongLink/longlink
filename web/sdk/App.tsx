import { Toaster } from '@/ui/sonner';
import { ThemeProvider } from '@/components/theme';
import { RouterProvider, createBrowserRouter } from 'react-router';
import Layout from './Layout';
import NotFound from '@/pages/NotFound';
import Longlink from './Longlink';

const router = createBrowserRouter([
    {
        path: '/',
        element: <Layout />,
        children: [
            { index: true, element: <Longlink /> },
            { path: '*', element: <Longlink /> },
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
