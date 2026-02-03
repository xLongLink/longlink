import { RouterProvider, createBrowserRouter } from 'react-router';
import { ThemeProvider } from "@/components/theme"
import { Home } from '@/pages/Home';
import { Login } from '@/pages/Login';
import { Module } from '@/pages/Module';
import { Organization } from '@/pages/Organization';

import { Test } from '@/pages/Test';

const router = createBrowserRouter([
    { path: '/', element: <Home /> },
    { path: '/test', element: <Test /> },
    { path: '/login', element: <Login /> },
    {
        path: '/:org/*',
        element: <Organization />,
    },
    {
        path: '/:org/tools/:tool/*',
        element: <Module />,
    },
]);


export function App() {
    return (
        <ThemeProvider>
            <RouterProvider router={router} />
        </ThemeProvider>
    );
}
export default App;
