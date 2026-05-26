import { Auth } from '@/components/Auth';
import { apiUrl } from '@/lib/api';
import { Toaster } from '@ui/sonner';
import { RouterProvider, createBrowserRouter } from 'react-router';
import impressumMarkdown from '../legal/impressum.md?raw';
import privacyMarkdown from '../legal/privacy.md?raw';
import termsMarkdown from '../legal/terms.md?raw';
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
    XmlLayoutPage,
    XmlOverviewPage,
} from './docs';
import DocsLayout from './docs/Layout';
import { LegalPage } from './pages/LegalPage';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import Organization from './pages/Organization';
import Organizations from './pages/Organizations';
import Playground from './pages/Playground';
import Sample from './pages/Sample';
import Settings from './pages/Settings';
import Admin from './pages/Admin';
import AdminOrganization from './pages/admin/Organization';
import AdminUsers from './pages/admin/Users';
import AdminCompute from './pages/admin/Compute';
import AdminDatabase from './pages/admin/Database';
import AdminStorage from './pages/admin/Storage';
import Theme from './pages/Theme';
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
                { path: 'xml/layout', element: <XmlLayoutPage /> },
            ],
        },
        { path: 'playground', element: <Playground /> },
        { path: 'theme', element: <Theme /> },
        { path: 'sample', element: <Sample /> },
        { path: 'impressum', element: <LegalPage title="Impressum" content={impressumMarkdown} /> },
        { path: 'terms', element: <LegalPage title="Terms" content={termsMarkdown} /> },
        { path: 'privacy', element: <LegalPage title="Privacy" content={privacyMarkdown} /> },
        {
            path: 'organizations',
            element: (
                <Auth>
                    <Organizations />
                </Auth>
            ),
        },
        {
            path: 'settings',
            element: (
                <Auth>
                    <Settings />
                </Auth>
            ),
        },
        {
            path: 'admin',
            element: <Admin />,
            children: [
                { index: true, element: <AdminUsers /> },
                { path: 'users', element: <AdminUsers /> },
                { path: 'organization', element: <AdminOrganization /> },
                { path: 'database', element: <AdminDatabase /> },
                { path: 'storage', element: <AdminStorage /> },
                { path: 'compute', element: <AdminCompute /> },
            ],
        },
        {
            path: ':org',
            element: (
                <Auth>
                    <Organization />
                </Auth>
            ),
        },
        {
            path: ':org/applications',
            element: (
                <Auth>
                    <Organization sectionName="applications" />
                </Auth>
            ),
        },
        {
            path: ':org/people',
            element: (
                <Auth>
                    <Organization sectionName="people" />
                </Auth>
            ),
        },
        {
            path: ':org/settings',
            element: (
                <Auth>
                    <Organization sectionName="settings" />
                </Auth>
            ),
        },
        {
            path: ':org/:app/*',
            element: (
                <Auth>
                    <View metadata={apiUrl('/api/:org/:app/metadata.json')} baseurl={apiUrl('/api/apps/:app')} />
                </Auth>
            ),
        },
        {
            path: '*',
            element: (
                <Auth>
                    <NotFound />
                </Auth>
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
