import { RouterProvider, createBrowserRouter } from 'react-router';
import { ThemeProvider } from '@/components/theme';
import { Home } from '@/pages/Home';
import { Login } from '@/pages/Login';
import { Organization } from '@/pages/Organization';

import { Tools } from '@/components/tools';
import { Solutions } from '@/components/solutions';
import { Workflows } from '@/components/workflows';
import { Overview } from '@/components/overview';

import { AppsRouter } from '@/Apps';

const router = createBrowserRouter([
    { path: '/', element: <Home /> },
    { path: '/login', element: <Login /> },

    {
        path: '/:org',
        element: <Organization />,
        children: [
            { index: true, element: <Overview /> },
            { path: 'tools', element: <Tools /> },
            { path: 'people', element: <div>People Page</div> },
            { path: 'solutions', element: <Solutions /> },
            { path: 'workflows', element: <Workflows /> },

            // dynamic modules
            {
                path: ':apps/*',
                element: <AppsRouter />
            }
        ]
    }
]);

export default function App() {
    return (
        <ThemeProvider>
            <RouterProvider router={router} />
        </ThemeProvider>
    );
}