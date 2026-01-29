import { RouterProvider, createBrowserRouter } from 'react-router';
import { Home } from './pages/Home';
import { Organization } from './pages/Organization';
import { OrganizationOverview } from './pages/OrganizationOverview';
import { OrganizationPlaceholder } from './pages/OrganizationPlaceholder';


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
            { index: true, element: <OrganizationOverview /> },
            { path: 'projects', element: <OrganizationPlaceholder title="Projects" /> },
            {
                path: 'people',
                element: <OrganizationPlaceholder title="People" />,
            }
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
