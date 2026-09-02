import { api } from '@/lib/api';
import { Seo } from '@/components/Seo';
import { startCase } from '@/lib/utils';
import { pagesSchema } from '@/xml/pages';
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

type ApplicationRuntimeProps = {
    children: (application: { content: ReactNode; tabs: readonly NavigationTab[] }) => ReactNode;
    navigationBaseUrl?: string;
    pagesUrl?: string;
    requestBaseUrl?: string;
};

const EMPTY_PAGES = [] as const;

/** Owns one XML runtime for the lifetime selected by its React key. */
function ApplicationXmlRuntime({
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

        // Keep XML-triggered application navigation within the client router.
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

/** Resolves and renders the current manifest-defined application page. */
export function ApplicationRuntime({
    children,
    navigationBaseUrl = '/',
    pagesUrl = '/pages.json',
    requestBaseUrl = '/',
}: ApplicationRuntimeProps) {
    const { '*': routePath = '' } = useParams();
    const { data: registeredPages, error } = useQuery({
        queryKey: ['api', pagesUrl],
        queryFn: async ({ signal }) => pagesSchema.parse(await api(pagesUrl, { signal }).json()),
    });
    const pages = registeredPages ?? EMPTY_PAGES;
    const match = matchRoutes(
        pages.map((page) => ({
            path: page.route,
            page,
        })),
        `/${routePath}`
    )?.[0];

    const activeRouteMatch = match
        ? {
              page: match.route.page,
              params: Object.fromEntries(
                  Object.entries(match.params).filter((entry): entry is [string, string] => entry[1] != null)
              ),
          }
        : null;
    const tabPages = pages.filter((page) => page.route !== '/' && !page.route.includes('/:'));
    const firstTabPage = tabPages[0];

    // Let dynamic detail views share a tab with their matching list page.
    const activePage = !routePath ? firstTabPage : activeRouteMatch?.page;
    const activePageTitle = activePage?.name ?? (activePage ? startCase(activePage.tab) : undefined);
    const { data: activePageAst, error: activePageError } = useQuery({
        enabled: routePath.length > 0 && activePage !== undefined,
        queryKey: ['api', 'application-page', pagesUrl, activePage?.path],
        queryFn: async ({ signal }) => {
            if (!activePage) throw new Error('No active application page');

            const pageUrl = resolveRequestUrl(requestBaseUrl, activePage.path);
            const content = await api(pageUrl, { headers: { Accept: 'application/xml' }, signal }).text();

            return parseXML(content);
        },
        retry: false,
    });
    // Build one static navigation target per runtime tab.
    const tabs = tabPages.map(
        (page) =>
            ({
                href: resolveNavigationUrl(navigationBaseUrl, page.route),
                icon: page.icon ? getIconComponent(page.icon) : undefined,
                label: page.name || startCase(page.tab),
            }) satisfies NavigationTab
    );

    const loadingContent = (
        <Center minHeight="calc(100vh - 14rem)" width="100%">
            <Spinner label="Loading" />
        </Center>
    );
    let content: ReactNode;

    if (!routePath && firstTabPage) {
        content = <Navigate replace to={resolveNavigationUrl(navigationBaseUrl, firstTabPage.route)} />;
    } else if (registeredPages && routePath && !activeRouteMatch) {
        content = <NotFoundLayout />;
    } else if (error) {
        content = (
            <PageError
                description={error.message || 'The application definition could not be loaded.'}
                title="Unable to load this application"
            />
        );
    } else if (activePageAst && activePage && activeRouteMatch) {
        content = (
            <ApplicationXmlRuntime
                ast={activePageAst}
                key={JSON.stringify([
                    pagesUrl,
                    navigationBaseUrl,
                    requestBaseUrl,
                    activePage.route,
                    activePage.path,
                    routePath,
                ])}
                navigationBaseUrl={navigationBaseUrl}
                params={activeRouteMatch.params}
                requestBaseUrl={requestBaseUrl}
            />
        );
    } else if (registeredPages && !activePage) {
        content = (
            <PageError
                description="The application did not expose any pages to render."
                title="Unexpected application response"
            />
        );
    } else if (activePageError) {
        content = (
            <PageError
                description={activePageError.message || 'Failed to load page'}
                title="Unable to load this page"
            />
        );
    } else {
        content = loadingContent;
    }

    return children({
        content: activePageTitle ? (
            <>
                <Seo isIndexable={false} title={`${activePageTitle} | LongLink`} />
                {content}
            </>
        ) : (
            content
        ),
        tabs,
    });
}
