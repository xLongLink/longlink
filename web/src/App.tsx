import { RouterProvider, createBrowserRouter } from 'react-router';
import { Home } from './pages/Home';
import { Organization } from './pages/Organization';
import { Placeholder } from './pages/Placeholder';


import { ThemeProvider } from "@/components/theme-provider"

const router = createBrowserRouter([
    {
        path: '/',
        element: <Home />,
    },
    {
        path: '/:org',
        element: <Organization />,
        children: [
            { index: true, element: <Placeholder title="Overview" /> },
            { path: 'tools', element: <Placeholder title="Tools" /> },
            { path: 'solutions', element: <Placeholder title="Solutions" /> },
            { path: 'workflows', element: <Placeholder title="Workflows" /> },
            { path: 'people', element: <Placeholder title="People" /> }
        ],
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
