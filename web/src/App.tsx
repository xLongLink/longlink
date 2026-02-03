import { RouterProvider, createBrowserRouter } from 'react-router';
import { ThemeProvider } from '@/components/theme';
import { Home } from '@/pages/Home';
import { Login } from '@/pages/Login';
import { Module } from '@/pages/Module';
import { Organization } from '@/pages/Organization';

import { Tools } from '@/components/tools';
import { Solutions } from '@/components/solutions';
import { Workflows } from '@/components/workflows';


const router = createBrowserRouter([
    { path: '/', element: <Home /> },
    { path: '/login', element: <Login /> },

    // Organization Routes
    { path: '/:org/*', element: <Organization /> },
    { path: '/:org/tools', element: <Tools /> },
    { path: '/:org/people', element: <div>People Page</div> },
    { path: '/:org/solutions', element: <Solutions /> },
    { path: '/:org/workflows', element: <Workflows /> },

    // Module Routes
    { path: '/:org/:tool/*', element: <Module /> },
]);


export default function App() {
    return (
        <ThemeProvider>
            <RouterProvider router={router} />
        </ThemeProvider>
    );
}