import { z } from 'zod';
import startCase from 'lodash/startCase';
import { Card } from '@astryxdesign/core/Card';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Center } from '@astryxdesign/core/Center';
import { Spinner } from '@astryxdesign/core/Spinner';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { generatePath, matchRoutes, useNavigate, useParams, type RouteObject } from 'react-router';
import type { TopLayoutTab } from '@/layout/TopLayout';
import type { Status } from '@/lib/generated/platform-api-v1/types.gen';
import { fetchApiText } from '@/lib/api';
import { RenderXML } from '@/xml/runtime';
import NotFound from '@/platform/NotFound';
import XmlLayout from '@/xml/runtime/layout';
import { useApiQuery } from '@/hooks/use-api';
import { getIconComponent } from '@/lib/icons';
import { createContext as createXmlContext, parseXML, resolveRequestUrl, type ASTNode, type XmlRuntime } from '@/xml';

const pageSchema = z.object({
    tab: z.string().trim().min(1),
    path: z.string().trim().min(1),
    name: z.string().trim().min(1).optional(),
    icon: z.string().trim().min(1).optional(),
    route: z.string().trim(),
});

type RuntimePage = z.infer<typeof pageSchema>;

type ViewProps = {
    applicationStatus?: Status;
    isApplicationLoading?: boolean;
    pages: string;
};

type ErrorStateProps = {
    isAlert?: boolean;
    message: string;
    title: string;
};

type PageState = {
    ast: ASTNode[];
    error: string | null;
    loading: boolean;
    runtimeContext: XmlRuntime;
};

const emptyRouteParams: Record<string, string> = {};

/** Returns true when a page route contains dynamic path segments. */
function pageRouteIsDynamic(route: string): boolean {
    return /(?:^|\/):/.test(route);
}

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

/** Builds an app-shell href for one page route path. */
function resolveApplicationHref(route: string, organization?: string, application?: string): string {
    const basePath =
        application && organization
            ? generatePath('/orgs/:organization/apps/:application', { organization, application })
            : organization
              ? generatePath('/orgs/:organization', { organization })
              : '';

    // Use the application root for empty routes.
    if (!route) {
        return basePath || '/';
    }

    return `${basePath}/${route}`;
}

/**
 * Renders registered XML pages for Platform and Application routes.
 */
export default function View({ applicationStatus, isApplicationLoading, pages }: ViewProps) {
    const { organization, application, '*': wildcardPath } = useParams();
    const navigate = useNavigate();
    const [pageStates, setPageStates] = useState<Record<string, PageState>>({});
    const pageStatesRef = useRef<Record<string, PageState>>({});
    const inFlightPageKeysRef = useRef<Set<string>>(new Set());
    const resolvedPagesBaseUrl = pages.replace(/pages\.json(?:[?#].*)?$/i, '');
    const applicationCanLoad =
        !isApplicationLoading && (applicationStatus === undefined || applicationStatus === 'running');
    const { data: registeredPages, error } = useApiQuery<RuntimePage[]>(pages, {
        enabled: applicationCanLoad,
        parse: (value) => z.array(pageSchema).parse(value),
    });
    const routePath = wildcardPath ?? '';
    const activeRouteMatch = useMemo(
        () => findPageRouteMatch(registeredPages, routePath),
        [registeredPages, routePath]
    );
    const firstTabPage = registeredPages?.find((page) => !pageRouteIsDynamic(page.route));

    /* Resolve explicit browser routes first so dynamic detail views can share a tab with their list page. */
    const activePage = activeRouteMatch?.page ?? (!routePath ? firstTabPage : undefined);
    const activeRouteParams = activeRouteMatch?.params ?? emptyRouteParams;

    const activePageStateKey = activePage
        ? `${pages}\u0000${activePage.path}\u0000${routePath}\u0000${activePage.tab}`
        : '';
    const activePageState = pageStates[activePageStateKey];
    const activePageTab = activePage?.tab;

    // Make the first navigable tab explicit in the URL when the app loads without a selected view.
    useEffect(() => {
        // Skip redirects when the view is already selected.
        if (!firstTabPage || routePath) {
            return;
        }

        // Keep root-routed tabs at the application root.
        if (firstTabPage.route) {
            navigate(resolveApplicationHref(firstTabPage.route, organization, application), { replace: true });
        }
    }, [application, firstTabPage, navigate, organization, routePath]);

    const { activeTab, tabs } = useMemo(() => {
        const tabGroups = new Map<string, TopLayoutTab>();

        // Build one visible navigation target per tab.
        for (const page of registeredPages ?? []) {
            const dynamic = pageRouteIsDynamic(page.route);
            const currentGroup = tabGroups.get(page.tab);

            // Dynamic pages need concrete params, so they cannot be direct navigation targets.
            if (!page.route || dynamic || currentGroup) {
                continue;
            }

            const label = page.name || startCase(page.tab);
            const icon = page.icon ? getIconComponent(page.icon) : undefined;
            const href = resolveApplicationHref(page.route, organization, application);

            // Prefer static pages as tab targets because dynamic routes need concrete parameter values.
            tabGroups.set(page.tab, {
                href,
                icon,
                label,
            });
        }

        return { activeTab: activePageTab ? tabGroups.get(activePageTab)?.href : '', tabs: [...tabGroups.values()] };
    }, [activePageTab, application, organization, registeredPages]);

    /* Load each page once for the active route instance. */
    useEffect(() => {
        // Skip page loading until an active page can render.
        if (!applicationCanLoad || !activePage) {
            return;
        }

        const existingPageState = pageStatesRef.current[activePageStateKey];
        const inFlightPageKeys = inFlightPageKeysRef.current;

        // Reuse completed page state for matching route instances.
        if (existingPageState && !existingPageState.loading) {
            return;
        }

        // Avoid duplicate requests for the same page state.
        if (inFlightPageKeys.has(activePageStateKey)) {
            return;
        }

        const runtimeContext = createXmlContext();

        runtimeContext.services.navigationBaseUrl = resolveApplicationHref('', organization, application);
        runtimeContext.scope.bindings.params = activeRouteParams;

        const loadingPageState: PageState = { ast: [], error: null, loading: true, runtimeContext };
        let pageUrl: string;

        // Validate registered page paths before fetch so an app cannot request external URLs.
        try {
            pageUrl = resolveRequestUrl(resolvedPagesBaseUrl, activePage.path);
        } catch (urlError: unknown) {
            setPageStates((current) => {
                const next = {
                    ...current,
                    [activePageStateKey]: {
                        ...loadingPageState,
                        error: urlError instanceof Error ? urlError.message : 'Invalid page URL',
                        loading: false,
                    },
                };

                pageStatesRef.current = next;

                return next;
            });

            return;
        }

        const controller = new AbortController();

        inFlightPageKeys.add(activePageStateKey);
        setPageStates((current) => {
            const next = { ...current, [activePageStateKey]: loadingPageState };

            pageStatesRef.current = next;

            return next;
        });

        void fetchApiText(pageUrl, {
            headers: { Accept: 'application/xml' },
            signal: controller.signal,
        })
            .then((content) => {
                // Ignore responses after the effect is cleaned up.
                if (!controller.signal.aborted) {
                    const ast = parseXML(content);

                    setPageStates((current) => {
                        const next = {
                            ...current,
                            [activePageStateKey]: {
                                ...current[activePageStateKey],
                                ast,
                                error: null,
                                loading: false,
                            },
                        };

                        pageStatesRef.current = next;

                        return next;
                    });
                }
            })
            .catch((fetchError: unknown) => {
                // Ignore aborts from route changes or cleanup.
                if (controller.signal.aborted) {
                    return;
                }

                setPageStates((current) => {
                    const next = {
                        ...current,
                        [activePageStateKey]: {
                            ...current[activePageStateKey],
                            error: fetchError instanceof Error ? fetchError.message : 'Failed to load page',
                            loading: false,
                        },
                    };

                    pageStatesRef.current = next;

                    return next;
                });
            })
            .finally(() => {
                inFlightPageKeys.delete(activePageStateKey);
            });

        return () => {
            controller.abort();
            inFlightPageKeys.delete(activePageStateKey);
        };
    }, [
        activePage,
        activePageStateKey,
        activeRouteParams,
        applicationCanLoad,
        application,
        organization,
        pages,
        resolvedPagesBaseUrl,
    ]);

    let applicationState: ReactNode = null;

    // Show deployment loading only while status or access is still resolving.
    if (isApplicationLoading || applicationStatus === 'creating') {
        applicationState = isApplicationLoading ? (
            <Spinner label="Loading" />
        ) : (
            <Card maxWidth={576} padding={6} width="100%">
                <EmptyState
                    description="Please try again in a moment."
                    headingLevel={1}
                    title="Application is being deployed"
                />
            </Card>
        );
    } else if (applicationStatus === 'failed' || applicationStatus === 'deleting') {
        // Keep failed and deleting applications out of the runtime while surfacing their lifecycle state.
        applicationState = (
            <ErrorState
                isAlert={applicationStatus === 'failed'}
                message={
                    applicationStatus === 'failed'
                        ? 'LongLink could not deploy this application. Contact an administrator before trying again.'
                        : 'This application is unavailable while LongLink removes it.'
                }
                title={
                    applicationStatus === 'failed' ? 'Application deployment failed' : 'Application is being deleted'
                }
            />
        );
    } else if (error) {
        // Surface page manifest loading failures in the shell.
        applicationState = (
            <ErrorState
                message={error.message || 'The application definition could not be loaded.'}
                title="Unable to load this application"
            />
        );
    }

    if (applicationState) {
        return (
            <XmlLayout activeTab={activeTab} tabs={tabs}>
                <Center minHeight="calc(100vh - 14rem)" width="100%">
                    {applicationState}
                </Center>
            </XmlLayout>
        );
    }

    // Delegate unknown app routes to the shared 404 page.
    if (registeredPages && routePath && !activeRouteMatch) {
        return <NotFound />;
    }

    const renderedPagePanels = Object.entries(pageStates).map(([pageStateKey, pageState]) => {
        // Render only valid page panels from the current cache.
        if (!pageState.ast.length || !pageStateKey.startsWith(`${pages}\u0000`)) {
            return null;
        }

        return (
            <Stack key={pageStateKey} as="section" gap={6} hidden={pageStateKey !== activePageStateKey}>
                <RenderXML ast={pageState.ast} baseUrl={resolvedPagesBaseUrl} ctx={pageState.runtimeContext} />
            </Stack>
        );
    });

    let activeFallback: ReactNode = null;

    // Choose the visible fallback for the active page.
    if (!activePage) {
        activeFallback = (
            <ErrorState
                message="The application did not expose any pages to render."
                title="Unexpected application response"
            />
        );
    } else if (activePageState?.error) {
        activeFallback = <ErrorState message={activePageState.error} title="Unable to load this page" />;
    } else if (!activePageState || activePageState.loading) {
        activeFallback = <Spinner label="Loading" />;
    }

    return (
        <XmlLayout activeTab={activeTab} tabs={tabs}>
            {renderedPagePanels}
            {activeFallback && (
                <Center minHeight="calc(100vh - 14rem)" width="100%">
                    {activeFallback}
                </Center>
            )}
        </XmlLayout>
    );
}

/** Renders a centered in-shell application state message. */
function ErrorState({ isAlert = true, message, title }: ErrorStateProps) {
    const { organization } = useParams();
    const actionHref = organization ? `/orgs/${organization}` : '/organizations';
    const actionLabel = organization ? 'Back to organization' : 'Back to organizations';

    return (
        <Card maxWidth={576} padding={6} width="100%">
            <EmptyState
                actions={<Button href={actionHref} label={actionLabel} variant="primary" />}
                description={message}
                headingLevel={1}
                role={isAlert ? 'alert' : undefined}
                title={title}
            />
        </Card>
    );
}
