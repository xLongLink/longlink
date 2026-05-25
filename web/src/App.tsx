import { RequireAuth } from '@/components/Auth';
import { apiUrl } from '@/lib/api';
import { Toaster } from '@ui/sonner';
import { RouterProvider, createBrowserRouter } from 'react-router';
import DocsLayout from './docs/Layout';
import {
    ControlPlanePage,
    DocsOverviewPage,
    SdkBuildingPage,
    SdkDatabasePage,
    SdkEnvironmentsPage,
    SdkOverviewPage,
    SdkRoutesPage,
    SdkStoragePage,
    SdkTestingPage,
    SelfHostedControlPlanePage,
    XmlComponentsPage,
    XmlFieldPage,
    XmlLayoutPage,
    XmlOverviewPage,
} from './docs';
import Home from './pages/Home';
import Impressum from './pages/Impressum';
import NotFound from './pages/NotFound';
import Organization from './pages/Organization';
import Organizations from './pages/Organizations';
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
            path: 'organizations',
            element: (
                <RequireAuth>
                    <Organizations />
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
                    <Organization />
                </RequireAuth>
            ),
        },
        {
            path: ':org/:app/*',
            element: (
                <RequireAuth>
                    <View metadata={apiUrl('/api/:org/:app/metadata.json')} baseurl={apiUrl('/api/apps/:app')} />
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
