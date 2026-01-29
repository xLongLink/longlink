import { RouterProvider, createBrowserRouter } from 'react-router';
import { MarketingPage } from './pages/MarketingPage';
import { OrganizationLayout } from './pages/OrganizationLayout';
import { OrganizationOffering } from './pages/OrganizationOffering';
import { OrganizationOverview } from './pages/OrganizationOverview';
import { OrganizationPlaceholder } from './pages/OrganizationPlaceholder';
import { OrganizationProjects } from './pages/OrganizationProjects';

const router = createBrowserRouter([
    {
        path: '/',
        element: <MarketingPage />,
    },
    {
        path: '/:org',
        element: <OrganizationLayout />,
        children: [
            { index: true, element: <OrganizationOverview /> },
            { path: 'projects', element: <OrganizationProjects /> },
            { path: 'offering', element: <OrganizationOffering /> },
            {
                path: 'careers',
                element: <OrganizationPlaceholder title="Careers" />,
            },
            { path: 'news', element: <OrganizationPlaceholder title="News" /> },
            {
                path: 'people',
                element: <OrganizationPlaceholder title="People" />,
            },
            {
                path: 'documents',
                element: <OrganizationPlaceholder title="Documents" />,
            },
        ],
    },
]);

export function App() {
    return <RouterProvider router={router} />;
}
export default App;
