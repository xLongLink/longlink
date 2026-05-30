import { Auth } from '@/components/Auth';
import { apiUrl } from '@/lib/api';
import { useOrg } from '@/hooks/use-org';
import { Toaster } from '@ui/sonner';
import { RouterProvider, createBrowserRouter } from 'react-router';
import { useParams } from 'react-router';
import impressumMarkdown, { metadata as impressumMetadata } from '../legal/impressum.md';
import privacyMarkdown, { metadata as privacyMetadata } from '../legal/privacy.md';
import termsMarkdown, { metadata as termsMetadata } from '../legal/terms.md';
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
import DocsPage from './pages/Docs';
import Theme from './pages/Theme';
import View from './pages/View';

import docsApiMarkdown, { metadata as docsApiMetadata } from '../docs/api/index.md';
import docsSelfHostedMarkdown, { metadata as docsSelfHostedMetadata } from '../docs/api/self-hosted.md';
import docsIndexMarkdown, { metadata as docsIndexMetadata } from '../docs/index.md';
import docsSdkBuildingMarkdown, { metadata as docsSdkBuildingMetadata } from '../docs/sdk/building.md';
import docsSdkDatabaseMarkdown, { metadata as docsSdkDatabaseMetadata } from '../docs/sdk/database.md';
import docsSdkEnvironmentsMarkdown, { metadata as docsSdkEnvironmentsMetadata } from '../docs/sdk/environments.md';
import docsSdkMarkdown, { metadata as docsSdkMetadata } from '../docs/sdk/index.md';
import docsSdkRoutesMarkdown, { metadata as docsSdkRoutesMetadata } from '../docs/sdk/routes.md';
import docsSdkStorageMarkdown, { metadata as docsSdkStorageMetadata } from '../docs/sdk/storage.md';
import docsSdkTestingMarkdown, { metadata as docsSdkTestingMetadata } from '../docs/sdk/testing.md';
import docsXmlComponentsMarkdown, { metadata as docsXmlComponentsMetadata } from '../docs/xml/components.md';
import docsXmlLayoutMarkdown, { metadata as docsXmlLayoutMetadata } from '../docs/xml/layout.md';
import docsXmlMarkdown, { metadata as docsXmlMetadata } from '../docs/xml/index.md';

type RuntimeWindow = Window & {
    __LONGLINK_BASEURL__?: string;
};


/** Returns the server-injected SDK base URL, if present. */
function getSdkBaseUrl(): string {
    if (typeof window === 'undefined') {
        return '';
    }

    const baseUrl = (window as RuntimeWindow).__LONGLINK_BASEURL__ ?? '';

    if (!baseUrl) {
        return '';
    }

    return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

/**
 * Builds the route tree for the current bundle mode.
 */
function getRoutes() {
    // SDK bundle serves the app runtime without control-plane routes.
    if (import.meta.env.MODE === 'sdk') {
        const baseUrl = getSdkBaseUrl();
        const metadataUrl = baseUrl ? `${baseUrl}metadata.json` : '/metadata.json';

        return [{ path: '/', element: <View metadata={metadataUrl} baseurl={baseUrl} /> }];
    }

    // Default bundle serves the full app with control-plane routes.
    return [
        { path: '/', element: <Home /> },
        { path: 'docs', element: <DocsPage content={docsIndexMarkdown} metadata={docsIndexMetadata} /> },
        { path: 'docs/api', element: <DocsPage content={docsApiMarkdown} metadata={docsApiMetadata} /> },
        {
            path: 'docs/api/self-hosted',
            element: <DocsPage content={docsSelfHostedMarkdown} metadata={docsSelfHostedMetadata} />,
        },
        { path: 'docs/sdk', element: <DocsPage content={docsSdkMarkdown} metadata={docsSdkMetadata} /> },
        {
            path: 'docs/sdk/building',
            element: <DocsPage content={docsSdkBuildingMarkdown} metadata={docsSdkBuildingMetadata} />,
        },
        {
            path: 'docs/sdk/database',
            element: <DocsPage content={docsSdkDatabaseMarkdown} metadata={docsSdkDatabaseMetadata} />,
        },
        {
            path: 'docs/sdk/environments',
            element: <DocsPage content={docsSdkEnvironmentsMarkdown} metadata={docsSdkEnvironmentsMetadata} />,
        },
        { path: 'docs/sdk/routes', element: <DocsPage content={docsSdkRoutesMarkdown} metadata={docsSdkRoutesMetadata} /> },
        {
            path: 'docs/sdk/storage',
            element: <DocsPage content={docsSdkStorageMarkdown} metadata={docsSdkStorageMetadata} />,
        },
        {
            path: 'docs/sdk/testing',
            element: <DocsPage content={docsSdkTestingMarkdown} metadata={docsSdkTestingMetadata} />,
        },
        { path: 'docs/xml', element: <DocsPage content={docsXmlMarkdown} metadata={docsXmlMetadata} /> },
        {
            path: 'docs/xml/components',
            element: <DocsPage content={docsXmlComponentsMarkdown} metadata={docsXmlComponentsMetadata} />,
        },
        { path: 'docs/xml/layout', element: <DocsPage content={docsXmlLayoutMarkdown} metadata={docsXmlLayoutMetadata} /> },
        { path: 'playground', element: <Playground /> },
        { path: 'theme', element: <Theme /> },
        { path: 'sample', element: <Sample /> },
        {
            path: 'impressum',
            element: <LegalPage title="Impressum" content={impressumMarkdown} metadata={impressumMetadata} />,
        },
        { path: 'terms', element: <LegalPage title="Terms" content={termsMarkdown} metadata={termsMetadata} /> },
        {
            path: 'privacy',
            element: <LegalPage title="Privacy" content={privacyMarkdown} metadata={privacyMetadata} />,
        },
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
                { path: 'organizations', element: <AdminOrganization /> },
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
                    <OrgAppView />
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

/** Resolves an organization app name to its proxy-backed XML view. */
function OrgAppView() {
    const { org = '', app = '' } = useParams();
    const { org: organization, isLoading, error } = useOrg(org);
    const orgApp = organization?.apps.find((item) => item.name === app);

    // Keep the app route loading until the org payload resolves.
    if (isLoading) {
        return <div>Loading...</div>;
    }

    // Hide unknown org/app combinations behind the shared 404 page.
    if (error?.status === 404 || !organization || !orgApp) {
        return <NotFound />;
    }

    return (
        <View
            metadata={apiUrl(`/api/apps/${orgApp.id}/proxy/metadata.json`)}
            baseurl={apiUrl(`/api/apps/${orgApp.id}/proxy/`)}
        />
    );
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
