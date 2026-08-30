import { api } from '@/lib/api';
import { startCase } from '@/lib/utils';
import { pagesSchema } from '@/xml/pages';
import { PageError } from '@/components/Utils';
import { useQuery } from '@tanstack/react-query';
import { Center } from '@astryxdesign/core/Center';
import { Spinner } from '@astryxdesign/core/Spinner';
import { getIconComponent } from '@/components/ui/Icon';
import NotFoundLayout from '@/components/layouts/NotFound';
import { useEffect, useMemo, type ReactNode } from 'react';
import type { NavigationTab } from '@/platform/layouts/Platform';
import { matchRoutes, useNavigate, useParams } from 'react-router';
import { resolveNavigationUrl, resolveRequestUrl } from '@/xml/core/url';
import { createContext as createXmlContext, parseXML, RenderXML } from '@/xml';

type ApplicationRuntimeProps = {
    children: (application: { content: ReactNode; tabs: readonly NavigationTab[] }) => ReactNode;
    navigationBaseUrl?: string;
    pagesUrl?: string;
    requestBaseUrl?: string;
};

/** Resolves and renders the current manifest-defined application page. */
export function ApplicationRuntime({
    children,
    navigationBaseUrl = '/',
    pagesUrl = '/pages.json',
    requestBaseUrl = '/',
}: ApplicationRuntimeProps) {
    const { '*': routePath = '' } = useParams();
    const navigate = useNavigate();
    const { data: registeredPages, error } = useQuery({
        queryKey: ['api', pagesUrl],
        queryFn: async ({ signal }) => pagesSchema.parse(await api(pagesUrl, { signal }).json()),
    });
    const pages = registeredPages ?? [];
    const activeRouteMatch = useMemo(() => {
        const [match] =
            matchRoutes(
                (registeredPages ?? []).map((page) => ({
                    path: page.route,
                    page,
                })),
                `/${routePath}`
            ) ?? [];

        if (!match) return null;

        return {
            page: match.route.page,
            params: Object.fromEntries(
                Object.entries(match.params).filter((entry): entry is [string, string] => entry[1] != null)
            ),
        };
    }, [registeredPages, routePath]);
    const tabPages = pages.filter((page) => page.route !== '/' && !/(?:^|\/):/.test(page.route));
    const firstTabPage = tabPages[0];

    // Replace the root URL with the first navigable tab after the manifest loads.
    useEffect(() => {
        if (!routePath && firstTabPage) {
            navigate(resolveNavigationUrl(navigationBaseUrl, firstTabPage.route), { replace: true });
        }
    }, [firstTabPage, navigate, navigationBaseUrl, routePath]);

    // Let dynamic detail views share a tab with their matching list page.
    const activePage = !routePath ? firstTabPage : activeRouteMatch?.page;
    const runtimeContext = useMemo(() => {
        if (!activePage) return null;

        const context = createXmlContext(activeRouteMatch?.params ?? {});

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
    }, [activePage, activeRouteMatch?.params, navigate, navigationBaseUrl, requestBaseUrl]);
    const { data: activePageAst, error: activePageError } = useQuery({
        enabled: activePage !== undefined,
        queryKey: ['application-page', pagesUrl, activePage?.path],
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
        content = loadingContent;
    } else if (registeredPages && routePath && !activeRouteMatch) {
        content = <NotFoundLayout />;
    } else if (error) {
        content = (
            <PageError
                description={error.message || 'The application definition could not be loaded.'}
                title="Unable to load this application"
            />
        );
    } else if (activePageAst && runtimeContext) {
        content = <RenderXML ast={activePageAst} ctx={runtimeContext} />;
    } else if (!activePage) {
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

    return children({ content, tabs });
}
