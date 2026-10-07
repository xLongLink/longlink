import * as host from '@/views/host';
import type { ReactNode } from 'react';
import { startCase } from 'es-toolkit/compat';
import { JsxView } from '@/components/JsxView';
import { PageError } from '@/components/Utils';
import { viewsSchema } from '@/views/manifest';
import { MAX_SOURCE_SIZE } from '@/views/protocol';
import { Center } from '@astryxdesign/core/Center';
import { Spinner } from '@astryxdesign/core/Spinner';
import { skipToken, useQuery } from '@tanstack/react-query';
import { matchRoutes, Navigate, useParams } from 'react-router';
import type { NavigationTab } from '@/platform/layouts/Platform';
import { resolveNavigationUrl, resolveRequestUrl } from '@/lib/url';

type SolutionRuntimeProps = {
    children: (solution: { content: ReactNode; tabs: readonly NavigationTab[]; title?: string }) => ReactNode;
    navigationBaseUrl?: string;
    viewsUrl?: string;
};

const EMPTY_VIEWS = [] as const;

/** Formats a View filename, including dynamic parameter files, as its display title. */
function viewLabel(path: string): string {
    // SDK paths omit the extension; custom manifests may retain it.
    const filename = path.substring(path.lastIndexOf('/') + 1).replace(/\.jsx$/, '');
    return startCase(filename.replace(/^\[(.*)\]$/, '$1'));
}

/** Resolves and renders the current manifest-defined View. */
export function SolutionRuntime({ children, navigationBaseUrl = '/', viewsUrl = '/views.json' }: SolutionRuntimeProps) {
    const { '*': routePath = '' } = useParams();

    // Resolve JSX requests beside the manifest without changing its URL form.
    const viewsLocation = new URL(viewsUrl, 'http://longlink.local');
    const requestBaseLocation = new URL('.', viewsLocation);
    const requestBaseUrl = viewsUrl.startsWith('/') ? requestBaseLocation.pathname : requestBaseLocation.toString();
    const { data: registeredViews, error: viewsError } = useQuery({
        queryKey: ['api', viewsUrl],
        queryFn: async ({ signal }) => {
            const body = await host.load(viewsUrl, { signal });
            const data: unknown = JSON.parse(await body.text());
            return viewsSchema.parse(data);
        },
    });
    const views = registeredViews ?? EMPTY_VIEWS;
    const match = matchRoutes(
        views.map((view) => ({
            path: view.route,
            view,
        })),
        `/${routePath}`
    )?.[0];

    const tabViews = views.filter((view) => view.route !== '/' && !view.route.includes('/:'));

    // Let dynamic detail views share a tab with their matching list view.
    const activeView = routePath || tabViews.length === 0 ? match?.route.view : undefined;
    const activeViewTitle = activeView ? viewLabel(activeView.path) : undefined;
    const isNotFound = registeredViews !== undefined && routePath.length > 0 && match == null;
    const { data: activeViewSource, error: activeViewError } = useQuery({
        queryKey: ['api', 'solution-view', viewsUrl, activeView?.path],
        queryFn: activeView
            ? async ({ signal }) => {
                  const viewUrl = resolveRequestUrl(requestBaseUrl, activeView.path);
                  const body = await host.load(viewUrl, { headers: { Accept: 'text/plain' }, signal }, MAX_SOURCE_SIZE);
                  return body.text();
              }
            : skipToken,
        retry: false,
    });
    // Build one static navigation target per solution tab.
    const tabs = tabViews.map(
        (view) =>
            ({
                href: resolveNavigationUrl(navigationBaseUrl, view.route),
                label: viewLabel(view.path),
            }) satisfies NavigationTab
    );

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
    } else if (activeViewSource !== undefined && activeView && match) {
        content = (
            <JsxView
                source={activeViewSource}
                key={JSON.stringify([viewsUrl, navigationBaseUrl, activeView.route, activeView.path, routePath])}
                navigationBaseUrl={navigationBaseUrl}
                params={Object.fromEntries(
                    Object.entries(match.params).filter((entry): entry is [string, string] => entry[1] != null)
                )}
                requestBaseUrl={requestBaseUrl}
            />
        );
    } else if (registeredViews && !activeView) {
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
            <Center minHeight="calc(100vh - 14rem)" width="100%">
                <Spinner label="Loading" />
            </Center>
        );
    }

    return children({
        content,
        tabs,
        title: isNotFound ? 'Page Not Found' : activeViewTitle,
    });
}
