import { api } from '@/lib/api';
import { Seo } from '@/components/Seo';
import { startCase } from '@/lib/utils';
import { viewsSchema } from '@/xml/views';
import type { ASTNode } from '@/xml/types';
import { PageError } from '@/components/Utils';
import { useQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Center } from '@astryxdesign/core/Center';
import { Spinner } from '@astryxdesign/core/Spinner';
import { getIconComponent } from '@/components/ui/Icon';
import NotFoundLayout from '@/components/layouts/NotFound';
import type { NavigationTab } from '@/platform/layouts/Platform';
import { resolveNavigationUrl, resolveRequestUrl } from '@/xml/core/url';
import { matchRoutes, Navigate, useNavigate, useParams } from 'react-router';
import { createContext as createXmlContext, parseXML, RenderXML } from '@/xml';

type SolutionRuntimeProps = {
    children: (solution: { content: ReactNode; tabs: readonly NavigationTab[] }) => ReactNode;
    navigationBaseUrl?: string;
    viewsUrl?: string;
    requestBaseUrl?: string;
};

const EMPTY_VIEWS = [] as const;

/** Owns one XML runtime for the lifetime selected by its React key. */
function SolutionXmlRuntime({
    ast,
    navigationBaseUrl,
    params,
    requestBaseUrl,
}: {
    ast: ASTNode;
    navigationBaseUrl: string;
    params: Record<string, string>;
    requestBaseUrl: string;
}) {
    const navigate = useNavigate();
    const [runtime] = useState(() => {
        const context = createXmlContext(params);

        // Keep XML-triggered solution navigation within the client router.
        context.services.navigate = (url) => {
            const destination = new URL(url, window.location.origin);

            if (destination.origin === window.location.origin) {
                navigate(`${destination.pathname}${destination.search}${destination.hash}`);
                return;
            }

            window.location.assign(url);
        };
        context.services.navigationBaseUrl = navigationBaseUrl;
        context.services.requestBaseUrl = requestBaseUrl;
        return context;
    });

    return <RenderXML ast={ast} ctx={runtime} />;
}

/** Resolves and renders the current manifest-defined Solution View. */
export function SolutionRuntime({
    children,
    navigationBaseUrl = '/',
    viewsUrl = '/views.json',
    requestBaseUrl = '/',
}: SolutionRuntimeProps) {
    const { '*': routePath = '' } = useParams();
    const { data: registeredViews, error: viewsError } = useQuery({
        queryKey: ['api', viewsUrl],
        queryFn: async ({ signal }) => viewsSchema.parse(await api(viewsUrl, { signal }).json()),
    });
    const views = registeredViews ?? EMPTY_VIEWS;
    const match = matchRoutes(
        views.map((view) => ({
            path: view.route,
            view,
        })),
        `/${routePath}`
    )?.[0];

    const activeRouteMatch = match
        ? {
              view: match.route.view,
              params: Object.fromEntries(
                  Object.entries(match.params).filter((entry): entry is [string, string] => entry[1] != null)
              ),
          }
        : null;
    const tabViews = views.filter((view) => view.route !== '/' && !view.route.includes('/:'));
    const firstTabView = tabViews[0];

    // Let dynamic detail views share a tab with their matching list view.
    const activeView = !routePath ? firstTabView : activeRouteMatch?.view;
    const activeViewTitle = activeView?.name ?? (activeView ? startCase(activeView.tab) : undefined);
    const { data: activeViewAst, error: activeViewError } = useQuery({
        enabled: routePath.length > 0 && activeView !== undefined,
        queryKey: ['api', 'solution-view', viewsUrl, activeView?.path],
        queryFn: async ({ signal }) => {
            if (!activeView) throw new Error('No active Solution View');

            const viewUrl = resolveRequestUrl(requestBaseUrl, activeView.path);
            const content = await api(viewUrl, { headers: { Accept: 'application/xml' }, signal }).text();

            return parseXML(content);
        },
        retry: false,
    });
    // Build one static navigation target per solution tab.
    const tabs = tabViews.map(
        (view) =>
            ({
                href: resolveNavigationUrl(navigationBaseUrl, view.route),
                icon: view.icon ? getIconComponent(view.icon) : undefined,
                label: view.name || startCase(view.tab),
            }) satisfies NavigationTab
    );

    const loadingContent = (
        <Center minHeight="calc(100vh - 14rem)" width="100%">
            <Spinner label="Loading" />
        </Center>
    );
    let content: ReactNode;

    if (!routePath && firstTabView) {
        content = <Navigate replace to={resolveNavigationUrl(navigationBaseUrl, firstTabView.route)} />;
    } else if (registeredViews && routePath && !activeRouteMatch) {
        content = <NotFoundLayout />;
    } else if (viewsError) {
        content = (
            <PageError
                description={viewsError.message || 'The solution definition could not be loaded.'}
                title="Unable to load this solution"
            />
        );
    } else if (activeViewAst && activeView && activeRouteMatch) {
        content = (
            <SolutionXmlRuntime
                ast={activeViewAst}
                key={JSON.stringify([
                    viewsUrl,
                    navigationBaseUrl,
                    requestBaseUrl,
                    activeView.route,
                    activeView.path,
                    routePath,
                ])}
                navigationBaseUrl={navigationBaseUrl}
                params={activeRouteMatch.params}
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
        content = (
            <PageError
                description={activeViewError.message || 'Failed to load view'}
                title="Unable to load this view"
            />
        );
    } else {
        content = loadingContent;
    }

    return children({
        content: activeViewTitle ? (
            <>
                <Seo isIndexable={false} title={`${activeViewTitle} | LongLink`} />
                {content}
            </>
        ) : (
            content
        ),
        tabs,
    });
}
