import { useState } from 'react';
import * as host from '@/views/host';
import { isEqual } from 'es-toolkit';
import type { ReactNode } from 'react';
import { startCase } from 'es-toolkit/compat';
import { PageError } from '@/components/utils';
import { JsxView } from '@/components/jsx-view';
import { manifestSchema } from '@/views/manifest';
import Platform from '@/components/layouts/platform';
import { DeferredIcon } from '@/components/custom/icon';
import { PageContainer } from '@/components/page-container';
import { skipToken, useQuery } from '@tanstack/react-query';
import { matchRoutes, Navigate, useParams } from 'react-router';
import { NativeLoading } from '@/components/custom/native-loading';
import { RELATIVE_URL_ORIGIN, resolveNavigationUrl, resolveRequestUrl } from '@/lib/url';

const EMPTY_VIEWS = [] as const;

/** Formats a View filename, including dynamic parameter files, as its display title. */
function viewLabel(path: string): string {
    // SDK paths omit the extension; custom manifests may retain it.
    const filename = path.substring(path.lastIndexOf('/') + 1).replace(/\.jsx$/, '');

    return startCase(filename.replace(/^\[(.*)\]$/, '$1'));
}

/** Resolves the current manifest-defined View and renders its page frame. */
export function SolutionPage({
    action,
    breadcrumb,
    developmentAction,
    formatTitle,
    navigationBaseUrl = '/',
    sidebarHeader,
    viewsUrl = '/views.json'
}: {
    action: ReactNode;
    breadcrumb: ReactNode;
    developmentAction?: ReactNode;
    formatTitle: (title: string | undefined) => string;
    navigationBaseUrl?: string;
    sidebarHeader?: ReactNode;
    viewsUrl?: string;
}) {
    const { '*': routePath = '' } = useParams();

    // Resolve JSX requests beside the manifest without changing its URL form.
    const viewsLocation = new URL(viewsUrl, RELATIVE_URL_ORIGIN);
    const requestBaseLocation = new URL('.', viewsLocation);
    const requestBaseUrl = viewsUrl.startsWith('/') ? requestBaseLocation.pathname : requestBaseLocation.toString();

    const { data: manifest, error: viewsError } = useQuery({
        queryKey: ['api', viewsUrl],
        queryFn: async ({ signal }) => {
            const body = await host.load(viewsUrl, { signal });
            const data: unknown = JSON.parse(await body.text());

            // Normalize legacy catalogs and explicit tabs before rendering navigation.
            const manifest = manifestSchema.parse(data);

            const tabs =
                manifest.tabs ??
                manifest.views
                    .filter((view) => view.route !== '/' && !view.route.includes('/', 1) && !view.route.includes('/:'))
                    .map((view) => ({ route: view.route, label: viewLabel(view.path), icon: undefined }));

            return {
                ...manifest,
                tabs: tabs.map((tab) => ({
                    route: tab.route,
                    label:
                        tab.label ??
                        viewLabel(manifest.views.find((view) => view.route === tab.route)?.path ?? tab.route),
                    icon: tab.icon
                }))
            };
        }
    });

    const views = manifest?.views ?? EMPTY_VIEWS;

    const match = matchRoutes(
        views.map((view) => ({ path: view.route, view })),
        `/${routePath}`
    )?.[0];

    // Preserve the active View's channel when manifest updates leave parameter values unchanged.
    const matchedParams = Object.fromEntries(
        Object.entries(match?.params ?? {}).filter((entry): entry is [string, string] => entry[1] != null)
    );

    const [params, setParams] = useState(matchedParams);

    if (!isEqual(params, matchedParams)) {
        setParams(matchedParams);
    }

    // Let nested and dynamic detail Views share their parent tab.
    const navigationTabs = manifest?.tabs ?? EMPTY_VIEWS;
    const activeView = routePath || navigationTabs.length === 0 ? match?.route.view : undefined;

    const activeViewTitle = activeView
        ? (navigationTabs.find((tab) => tab.route === activeView.route)?.label ?? viewLabel(activeView.path))
        : undefined;

    const isNotFound = manifest !== undefined && routePath.length > 0 && match == null;

    const { data: activeViewSource, error: activeViewError } = useQuery({
        queryKey: ['api', 'solution-view', viewsUrl, activeView?.path],
        queryFn: activeView
            ? async ({ signal }) => {
                  const viewUrl = resolveRequestUrl(requestBaseUrl, activeView.path);
                  const body = await host.load(viewUrl, { headers: { Accept: 'text/plain' }, signal });

                  return body.text();
              }
            : skipToken,
        retry: false
    });

    // Build one static navigation target per solution tab.
    const tabs = navigationTabs.map((view) => ({
        href: resolveNavigationUrl(navigationBaseUrl, view.route),
        label: view.label,
        icon: view.icon ? <DeferredIcon icon={view.icon} size="sm" /> : undefined
    }));

    // Keep wordmark navigation on the solution's first page.
    const homeHref = tabs[0]?.href ?? navigationBaseUrl;

    let content: ReactNode;

    // The browser never requests the solution server root, so mirror its redirect client-side.
    if (!routePath && tabs.length > 0) {
        return <Navigate replace to={tabs[0].href} />;
    }

    // The solution base redirects above; render errors and views below.
    if (isNotFound) {
        content = (
            <PageError description="This page doesn't exist or isn't available." title="We can't find that page" />
        );
    } else if (viewsError) {
        content = (
            <PageError
                description="The solution definition could not be loaded."
                title="Unable to load this solution"
            />
        );
    } else if (activeViewSource !== undefined && activeView && match && manifest) {
        content = (
            <JsxView
                source={activeViewSource}
                key={JSON.stringify([
                    viewsUrl,
                    navigationBaseUrl,
                    activeView.route,
                    activeView.path,
                    manifest.runtime,
                    routePath
                ])}
                navigationBaseUrl={navigationBaseUrl}
                params={params}
                requestBaseUrl={requestBaseUrl}
                runtime={manifest.runtime}
            />
        );
    } else if (manifest && !activeView) {
        content = (
            <PageError
                description="The solution did not expose any views to render."
                title="Unexpected solution response"
            />
        );
    } else if (activeViewError) {
        content = <PageError description="The view could not be loaded." title="Unable to load this view" />;
    } else {
        content = (
            <div className="flex min-h-[calc(100vh-14rem)] w-full min-w-0 items-center justify-center">
                <NativeLoading label="Loading" />
            </div>
        );
    }

    return (
        <Platform
            action={manifest?.development ? (developmentAction ?? action) : action}
            breadcrumb={breadcrumb}
            homeHref={homeHref}
            sidebarHeader={sidebarHeader}
            tabs={tabs}
        >
            <title>{formatTitle(isNotFound ? 'Page Not Found' : activeViewTitle)}</title>
            <PageContainer height="100%" minHeight={0} padding={2}>
                {content}
            </PageContainer>
        </Platform>
    );
}
