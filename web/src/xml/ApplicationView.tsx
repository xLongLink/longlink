import type { ReactNode } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { useQuery } from '@tanstack/react-query';
import { Center } from '@astryxdesign/core/Center';
import { Spinner } from '@astryxdesign/core/Spinner';
import { useEffect, useMemo, useState } from 'react';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { matchRoutes, useNavigate, useParams, type RouteObject } from 'react-router';
import { api } from '@/lib/api';
import NotFoundLayout from '@/components/layouts/NotFound';
import { resolveRequestUrl } from './core/url';
import { ApplicationLayout, applicationHref } from './ApplicationLayout';
import { pageRouteIsDynamic, pageSchema, type RuntimePage } from './pages';
import { createContext as createXmlContext, parseXML, RenderXML, type ASTNode, type XmlRuntime } from '.';

type RuntimeApplicationViewProps = {
    basePath?: string;
    pages?: string;
};

type PageState = { status: 'loading' } | { ast: [ASTNode]; status: 'ready' } | { message: string; status: 'error' };

type ActivePageState = PageState & { key: string; runtimeContext: XmlRuntime };

/** Finds the best runtime page for the current app-relative browser path. */
function findPageRouteMatch(pages: RuntimePage[] | undefined, path: string) {
    const [match] =
        matchRoutes(
            (pages ?? []).map((page): RouteObject & { page: RuntimePage } => ({ path: page.route || '/', page })),
            `/${path}`
        ) ?? [];

    // Stop when no page route matches the path.
    if (!match) return null;

    return {
        page: match.route.page,
        params: Object.fromEntries(
            Object.entries(match.params).filter((entry): entry is [string, string] => entry[1] != null)
        ),
    };
}

/** Renders XML pages registered by an application manifest. */
export function RuntimeApplicationView({ basePath = '/', pages = '/pages.json' }: RuntimeApplicationViewProps) {
    const { '*': wildcardPath } = useParams();
    const navigate = useNavigate();
    const [activePageState, setActivePageState] = useState<ActivePageState | null>(null);
    const resolvedPagesBaseUrl = pages.replace(/pages\.json(?:[?#].*)?$/i, '');
    const { data: registeredPages, error } = useQuery({
        queryKey: ['api', pages],
        queryFn: async ({ signal }) => pageSchema.array().parse(await api(pages, { signal }).json()),
    });
    const routePath = wildcardPath ?? '';
    const activeRouteMatch = useMemo(
        () => findPageRouteMatch(registeredPages, routePath),
        [registeredPages, routePath]
    );
    const firstTabPage = registeredPages?.find((page) => !pageRouteIsDynamic(page.route));

    /* Resolve explicit browser routes first so dynamic detail views can share a tab with their list page. */
    const activePage = activeRouteMatch?.page ?? (!routePath ? firstTabPage : undefined);
    const activeRouteParams = activeRouteMatch?.params;
    const activePageStateKey = activePage ? `${pages}\u0000${activePage.path}\u0000${routePath}` : '';
    const visiblePageState = activePageState?.key === activePageStateKey ? activePageState : null;

    // Make the first navigable tab explicit in the URL when the app loads without a selected view.
    useEffect(() => {
        // Skip redirects when the view is already selected.
        if (!firstTabPage || routePath) {
            return;
        }

        // Keep root-routed tabs at the application root.
        if (firstTabPage.route) {
            navigate(applicationHref(firstTabPage.route, basePath), { replace: true });
        }
    }, [basePath, firstTabPage, navigate, routePath]);

    /* Load the active page and discard inactive page state. */
    useEffect(() => {
        // Skip page loading until an active page can render.
        if (!activePage) {
            setActivePageState(null);
            return;
        }

        const runtimeContext = createXmlContext(activeRouteParams ?? {});

        runtimeContext.services.navigationBaseUrl = applicationHref('', basePath);

        const pageState = { key: activePageStateKey, runtimeContext };
        let pageUrl: string;

        // Validate registered page paths before fetch so an app cannot request external URLs.
        try {
            pageUrl = resolveRequestUrl(resolvedPagesBaseUrl, activePage.path);
        } catch (urlError: unknown) {
            setActivePageState({
                ...pageState,
                message: urlError instanceof Error ? urlError.message : 'Invalid page URL',
                status: 'error',
            });
            return;
        }

        const controller = new AbortController();

        setActivePageState({ ...pageState, status: 'loading' });

        void api(pageUrl, {
            headers: { Accept: 'application/xml' },
            signal: controller.signal,
        })
            .then((response) => response.text())
            .then((content) => {
                // Ignore responses after the effect is cleaned up.
                if (!controller.signal.aborted) {
                    const ast = parseXML(content);

                    setActivePageState({
                        ...pageState,
                        ast,
                        status: 'ready',
                    });
                }
            })
            .catch((fetchError: unknown) => {
                // Ignore aborts from route changes or cleanup.
                if (controller.signal.aborted) {
                    return;
                }

                setActivePageState({
                    ...pageState,
                    message: fetchError instanceof Error ? fetchError.message : 'Failed to load page',
                    status: 'error',
                });
            });

        return () => {
            controller.abort();
        };
    }, [activePage, activePageStateKey, activeRouteParams, basePath, resolvedPagesBaseUrl]);

    let content: ReactNode;

    if (!error && registeredPages && routePath && !activeRouteMatch) {
        content = <NotFoundLayout />;
    } else if (error) {
        content = (
            <Center minHeight="calc(100vh - 14rem)" width="100%">
                <Card maxWidth={576} padding={6} width="100%">
                    <EmptyState
                        description={error.message || 'The application definition could not be loaded.'}
                        headingLevel={1}
                        role="alert"
                        title="Unable to load this application"
                    />
                </Card>
            </Center>
        );
    } else if (visiblePageState?.status === 'ready') {
        content = (
            <RenderXML
                ast={visiblePageState.ast}
                baseUrl={resolvedPagesBaseUrl}
                ctx={visiblePageState.runtimeContext}
            />
        );
    } else {
        content = (
            <Center minHeight="calc(100vh - 14rem)" width="100%">
                {!activePage ? (
                    <Card maxWidth={576} padding={6} width="100%">
                        <EmptyState
                            description="The application did not expose any pages to render."
                            headingLevel={1}
                            role="alert"
                            title="Unexpected application response"
                        />
                    </Card>
                ) : visiblePageState?.status === 'error' ? (
                    <Card maxWidth={576} padding={6} width="100%">
                        <EmptyState
                            description={visiblePageState.message}
                            headingLevel={1}
                            role="alert"
                            title="Unable to load this page"
                        />
                    </Card>
                ) : (
                    <Spinner label="Loading" />
                )}
            </Center>
        );
    }

    return (
        <ApplicationLayout basePath={basePath} pages={registeredPages ?? []}>
            {content}
        </ApplicationLayout>
    );
}

export default RuntimeApplicationView;
