import { RequireAuth } from '@/components/Auth';
import { apiUrl } from '@/lib/api';
import { Toaster } from '@ui/sonner';
import { RouterProvider, createBrowserRouter } from 'react-router';
import DocsLayout from './docs/Layout';
import ControlPlanePage from './docs/api';
import SelfHostedControlPlanePage from './docs/api/self-hosted';
import DocsOverviewPage from './docs';
import SdkBuildingPage from './docs/sdk/building';
import SdkDatabasePage from './docs/sdk/database';
import SdkEnvironmentsPage from './docs/sdk/environments';
import SdkOverviewPage from './docs/sdk';
import SdkRoutesPage from './docs/sdk/routes';
import SdkStoragePage from './docs/sdk/storage';
import SdkTestingPage from './docs/sdk/testing';
import XmlComponentsPage from './docs/xml/components';
import XmlFieldPage from './docs/xml/field';
import XmlLayoutPage from './docs/xml/layout';
import XmlOverviewPage from './docs/xml';
import Home from './pages/Home';
import Impressum from './pages/Impressum';
import NotFound from './pages/NotFound';
import Org from './pages/Org';
import Orgs from './pages/Orgs';
import Playground from './pages/Playground';
import Privacy from './pages/Privacy';
import Sample from './pages/Sample';
import Settings from './pages/Settings';
import Terms from './pages/Terms';
import View from './pages/View';

/**
 * Builds the route tree for the current bundle mode.
 */
function getRoutes() {
    // SDK bundle serves the app runtime without control-plane routes.
    if (import.meta.env.MODE === 'sdk') {
        return [{ path: '/', element: <View metadata="/metadata.json" baseurl="" /> }];
    }

    // Default bundle serves the full app with control-plane routes.
    return [
        { path: '/', element: <Home /> },
        {
            path: 'docs',
            element: <DocsLayout />,
            children: [
                { index: true, element: <DocsOverviewPage /> },
                { path: 'api', element: <ControlPlanePage /> },
                { path: 'api/self-hosted', element: <SelfHostedControlPlanePage /> },
                { path: 'sdk', element: <SdkOverviewPage /> },
                { path: 'sdk/building', element: <SdkBuildingPage /> },
                { path: 'sdk/database', element: <SdkDatabasePage /> },
                { path: 'sdk/environments', element: <SdkEnvironmentsPage /> },
                { path: 'sdk/routes', element: <SdkRoutesPage /> },
                { path: 'sdk/storage', element: <SdkStoragePage /> },
                { path: 'sdk/testing', element: <SdkTestingPage /> },
                { path: 'xml', element: <XmlOverviewPage /> },
                { path: 'xml/components', element: <XmlComponentsPage /> },
                { path: 'xml/field', element: <XmlFieldPage /> },
                { path: 'xml/layout', element: <XmlLayoutPage /> },
            ],
        },
        { path: 'playground', element: <Playground /> },
        { path: 'sample', element: <Sample /> },
        { path: 'impressum', element: <Impressum /> },
        { path: 'terms', element: <Terms /> },
        { path: 'privacy', element: <Privacy /> },
        {
            path: 'orgs',
            element: (
                <RequireAuth>
                    <Orgs />
                </RequireAuth>
            ),
        },
        {
            path: 'settings',
            element: (
                <RequireAuth>
                    <Settings />
                </RequireAuth>
            ),
        },
        {
            path: ':org/*',
            element: (
                <RequireAuth>
                    <Org />
                </RequireAuth>
            ),
        },
        {
            path: ':org/apps/*',
            element: (
                <RequireAuth>
                    <Org />
                </RequireAuth>
            ),
        },
        {
            path: ':org/people/*',
            element: (
                <RequireAuth>
                    <Org />
                </RequireAuth>
            ),
        },
        {
            path: ':org/settings/*',
            element: (
                <RequireAuth>
                    <Org />
                </RequireAuth>
            ),
        },
        {
            path: ':org/:app/*',
            element: (
                <RequireAuth>
                    <View
                        metadata={apiUrl('/api/:org/:app/metadata.json')}
                        baseurl={apiUrl('/api/apps/:app')}
                    />
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
