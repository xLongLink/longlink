import type { ComponentType } from 'react';
import type { RouteObject } from 'react-router';
import { RouterProvider, createBrowserRouter } from 'react-router';
import type { SettingsRouteSection } from '@/pages/org/Settings';
import { Toaster } from '@/components/ui/sonner';

type AppRouter = ReturnType<typeof createBrowserRouter>;
type PageModule = { default: ComponentType };

let appRouter: AppRouter | null = null;

/** Builds admin routes with a persistent shell around tab-specific pages. */
function adminRoutes() {
    return {
        lazy: loadPage(() => import('@/pages/Admin')),
        children: [
            { path: 'admin/users', lazy: loadPage(() => import('@/pages/admin/Users')) },
            { path: 'admin/applications', lazy: loadPage(() => import('@/pages/admin/Applications')) },
            { path: 'admin/organizations', lazy: loadPage(() => import('@/pages/admin/Organizations')) },
            { path: 'admin/database', lazy: loadPage(() => import('@/pages/admin/Database')) },
            { path: 'admin/storage', lazy: loadPage(() => import('@/pages/admin/Storage')) },
            { path: 'admin/compute', lazy: loadPage(() => import('@/pages/admin/Compute')) },
            { path: 'admin/compute/:compute', lazy: loadPage(() => import('@/pages/admin/ComputeNamespaces')) },
            {
                path: 'admin/compute/:compute/namespace/:namespace',
                lazy: loadPage(() => import('@/pages/admin/ComputePods')),
            },
            { path: 'admin/operations', lazy: loadPage(() => import('@/pages/admin/Operations')) },
        ],
    };
}

/** Converts a default page export into a React Router lazy route. */
function loadPage(loader: () => Promise<PageModule>) {
    return async () => {
        const { default: Component } = await loader();

        return { Component };
    };
}

/** Loads one authenticated page without placing its implementation in the entry bundle. */
function loadAuthenticatedPage(loader: () => Promise<PageModule>) {
    return async () => {
        const [{ default: Page }, { Auth }] = await Promise.all([loader(), import('@/components/Auth')]);

        return {
            element: (
                <Auth>
                    <Page />
                </Auth>
            ),
        };
    };
}

/** Loads one authenticated organization settings route. */
function loadOrganizationRoute(settingsSection?: SettingsRouteSection) {
    return async () => {
        const [{ default: Organization }, { Auth }] = await Promise.all([
            import('@/pages/Organization'),
            import('@/components/Auth'),
        ]);

        return {
            element: (
                <Auth requiredRole="user">
                    <Organization settingsSection={settingsSection} />
                </Auth>
            ),
        };
    };
}

/** Loads the SDK XML application runtime. */
async function loadSdkApplicationRoute() {
    const { default: View } = await import('@/pages/View');

    return { element: <View pages="/pages.json" /> };
}

/** Builds the LongLink Platform route tree. */
export function getApiRoutes(): RouteObject[] {
    const loadLegalPage = loadPage(() => import('@/pages/legal/routes'));

    return [
        { path: '/', lazy: loadPage(() => import('@/pages/Home')) },
        {
            path: 'docs/*',
            lazy: loadPage(() => import('@/pages/docs/routes')),
        },
        ...['terms', 'privacy', 'impressum'].map((path) => ({ path, lazy: loadLegalPage })),
        { path: 'auth/register', lazy: loadPage(() => import('@/pages/auth/Register')) },
        { path: 'auth/verify-email', lazy: loadPage(() => import('@/pages/auth/VerifyEmail')) },
        { path: 'auth/forgot-password', lazy: loadPage(() => import('@/pages/auth/ForgotPassword')) },
        { path: 'auth/reset-password', lazy: loadPage(() => import('@/pages/auth/ResetPassword')) },
        { path: 'auth/complete', lazy: loadPage(() => import('@/pages/auth/Complete')) },
        {
            path: 'pricing',
            lazy: loadPage(() => import('@/pages/Pricing')),
        },
        {
            path: 'organizations',
            lazy: loadPage(() => import('@/pages/Organizations')),
        },
        {
            path: 'settings',
            lazy: loadAuthenticatedPage(() => import('@/pages/Settings')),
        },
        adminRoutes(),
        {
            path: 'orgs/:organization',
            lazy: loadOrganizationRoute(),
        },
        {
            path: 'orgs/:organization/settings',
            lazy: loadOrganizationRoute('organization'),
        },
        {
            path: 'orgs/:organization/settings/applications/:settingsApplication?',
            lazy: loadOrganizationRoute('applications'),
        },
        {
            path: 'orgs/:organization/settings/people',
            lazy: loadOrganizationRoute('people'),
        },
        {
            path: 'orgs/:organization/settings/database',
            lazy: loadOrganizationRoute('database'),
        },
        {
            path: 'orgs/:organization/settings/storage',
            lazy: loadOrganizationRoute('storage'),
        },
        {
            path: 'orgs/:organization/apps/:application/*',
            lazy: loadPage(() => import('@/pages/OrganizationApplication')),
        },
        {
            path: '*',
            lazy: loadPage(() => import('@/pages/NotFound')),
        },
    ];
}

/** Builds the standalone LongLink Application route tree. */
function getSdkRoutes(): RouteObject[] {
    return [{ path: '*', lazy: loadSdkApplicationRoute }];
}

/** Selects the route graph at build time so SDK bundles exclude Platform pages. */
function getRoutes(): RouteObject[] {
    return import.meta.env.MODE === 'sdk' ? getSdkRoutes() : getApiRoutes();
}

/** Returns the browser router, creating it lazily in the browser runtime. */
function getRouter(): AppRouter {
    appRouter ??= createBrowserRouter(getRoutes());

    return appRouter;
}

/** Waits until the current route's lazy module has loaded. */
export function waitForRouter(router: AppRouter): Promise<void> {
    // Synchronous routes are ready as soon as the router is created.
    if (router.state.initialized) {
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        const unsubscribe = router.subscribe((state) => {
            // Keep waiting while React Router resolves the initial lazy route.
            if (!state.initialized) {
                return;
            }

            unsubscribe();
            resolve();
        });
    });
}

/** Prepares the browser router before mounting or hydrating the app. */
export async function initializeApp(): Promise<void> {
    await waitForRouter(getRouter());
}

/** Renders one router with the global application UI. */
export function RoutedApp({ router }: { router: AppRouter }) {
    return (
        <>
            <RouterProvider router={router} />
            <Toaster position="bottom-right" />
        </>
    );
}

/** Renders the browser application router. */
export default function App() {
    return <RoutedApp router={getRouter()} />;
}
