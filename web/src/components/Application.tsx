import { api } from '@/lib/api';
import startCase from 'lodash/startCase';
import { PageError } from '@/components/Utils';
import { useQuery } from '@tanstack/react-query';
import { resolveRequestUrl } from '@/xml/core/url';
import { Center } from '@astryxdesign/core/Center';
import { Spinner } from '@astryxdesign/core/Spinner';
import { getIconComponent } from '@/components/ui/Icon';
import NotFoundLayout from '@/components/layouts/NotFound';
import { pageSchema, type RuntimePage } from '@/xml/pages';
import { useEffect, useMemo, type ReactNode } from 'react';
import { createContext as createXmlContext, parseXML, RenderXML } from '@/xml';
import { matchRoutes, useNavigate, useParams, type RouteObject } from 'react-router';

type ApplicationRuntimeProps = {
    children: (application: { content: ReactNode; tabs: readonly ApplicationTab[] }) => ReactNode;
    navigationBaseUrl: string;
    pagesUrl: string;
    requestBaseUrl: string;
};

type ApplicationTab = {
    href: string;
    icon?: ReturnType<typeof getIconComponent>;
    label: string;
};

/** Resolves and renders the current manifest-defined application page. */
export function ApplicationRuntime({ children, navigationBaseUrl, pagesUrl, requestBaseUrl }: ApplicationRuntimeProps) {
    const { '*': wildcardPath } = useParams();
    const navigate = useNavigate();
    const routePath = wildcardPath ?? '';
    const { data: registeredPages, error } = useQuery({
        queryKey: ['api', pagesUrl],
        queryFn: async ({ signal }) => pageSchema.array().parse(await api(pagesUrl, { signal }).json()),
    });
    const activeRouteMatch = useMemo(() => {
        const [match] =
            matchRoutes(
                (registeredPages ?? []).map((page): RouteObject & { page: RuntimePage } => ({
                    path: page.route || '/',
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
    const staticPages = (registeredPages ?? []).filter((page) => !/(?:^|\/):/.test(page.route));
    const firstTabPage = staticPages[0];

    // Resolve explicit browser routes first so dynamic detail views can share a tab with their list page.
    const activePage = activeRouteMatch?.page ?? (!routePath ? firstTabPage : undefined);
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
        return context;
    }, [activePage, activeRouteMatch?.params, navigate, navigationBaseUrl]);
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
    const tabs = new Map<string, ApplicationTab>();

    // Build one static navigation target per runtime tab.
    for (const page of staticPages) {
        if (!page.route || tabs.has(page.tab)) {
            continue;
        }

        tabs.set(page.tab, {
            href: `${navigationBaseUrl === '/' ? '' : navigationBaseUrl}/${page.route}`,
            icon: page.icon ? getIconComponent(page.icon) : undefined,
            label: page.name || startCase(page.tab),
        });
    }

    // Make the first navigable tab explicit in the URL when the app loads without a selected view.
    useEffect(() => {
        if (!firstTabPage || routePath || !firstTabPage.route) {
            return;
        }

        navigate(`${navigationBaseUrl === '/' ? '' : navigationBaseUrl}/${firstTabPage.route}`, { replace: true });
    }, [firstTabPage, navigate, navigationBaseUrl, routePath]);

    let content: ReactNode;

    if (!error && registeredPages && routePath && !activeRouteMatch) {
        content = <NotFoundLayout />;
    } else if (error) {
        content = (
            <PageError
                description={error.message || 'The application definition could not be loaded.'}
                title="Unable to load this application"
            />
        );
    } else if (activePageAst && runtimeContext) {
        content = <RenderXML ast={activePageAst} baseUrl={requestBaseUrl} ctx={runtimeContext} />;
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
        content = (
            <Center minHeight="calc(100vh - 14rem)" width="100%">
                <Spinner label="Loading" />
            </Center>
        );
    }

    return children({ content, tabs: [...tabs.values()] });
}
