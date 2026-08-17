import type { ReactNode } from 'react';
import { useEffect, useMemo } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { useQuery } from '@tanstack/react-query';
import { Center } from '@astryxdesign/core/Center';
import { Spinner } from '@astryxdesign/core/Spinner';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { matchRoutes, useNavigate, useParams, type RouteObject } from 'react-router';
import { api } from '@/lib/api';
import { resolveRequestUrl } from '@/xml/core/url';
import NotFoundLayout from '@/components/layouts/NotFound';
import { pageRouteIsDynamic, type RuntimePage } from '@/xml/pages';
import { createContext as createXmlContext, parseXML, RenderXML } from '@/xml';
import ApplicationLayout, { useApplicationLayout } from '../layouts/Application';

/** Resolves and renders the active XML application page. */
function ApplicationContent() {
    const { error, pagesUrl, registeredPages } = useApplicationLayout();
    const { '*': wildcardPath } = useParams();
    const navigate = useNavigate();
    const resolvedPagesBaseUrl = pagesUrl.replace(/pages\.json(?:[?#].*)?$/i, '');
    const routePath = wildcardPath ?? '';
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
    const firstTabPage = registeredPages?.find((page) => !pageRouteIsDynamic(page.route));

    /* Resolve explicit browser routes first so dynamic detail views can share a tab with their list page. */
    const activePage = activeRouteMatch?.page ?? (!routePath ? firstTabPage : undefined);
    const runtimeContext = useMemo(() => {
        if (!activePage) return null;

        const context = createXmlContext(activeRouteMatch?.params ?? {});

        context.services.navigationBaseUrl = '/';
        return context;
    }, [activePage, activeRouteMatch?.params]);
    const { data: activePageAst, error: activePageError } = useQuery({
        enabled: activePage !== undefined,
        queryKey: ['application-page', pagesUrl, activePage?.path],
        queryFn: async ({ signal }) => {
            if (!activePage) throw new Error('No active application page');

            const pageUrl = resolveRequestUrl(resolvedPagesBaseUrl, activePage.path);
            const content = await api(pageUrl, { headers: { Accept: 'application/xml' }, signal }).text();

            return parseXML(content);
        },
        retry: false,
    });

    // Make the first navigable tab explicit in the URL when the app loads without a selected view.
    useEffect(() => {
        // Skip redirects when the view is already selected.
        if (!firstTabPage || routePath) {
            return;
        }

        // Keep root-routed tabs at the application root.
        if (firstTabPage.route) {
            navigate(`/${firstTabPage.route}`, { replace: true });
        }
    }, [firstTabPage, navigate, routePath]);

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
    } else if (activePageAst && runtimeContext) {
        content = <RenderXML ast={activePageAst} baseUrl={resolvedPagesBaseUrl} ctx={runtimeContext} />;
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
                ) : activePageError ? (
                    <Card maxWidth={576} padding={6} width="100%">
                        <EmptyState
                            description={activePageError.message || 'Failed to load page'}
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

    return content;
}

/** Renders an SDK application from its local page manifest. */
export default function Application() {
    return (
        <ApplicationLayout pagesUrl="/pages.json">
            <ApplicationContent />
        </ApplicationLayout>
    );
}
