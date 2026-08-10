import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Center } from '@astryxdesign/core/Center';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { useTranslator } from '@astryxdesign/core/i18n';
import { Spinner } from '@astryxdesign/core/Spinner';
import { Stack } from '@astryxdesign/core/Stack';
import startCase from 'lodash/startCase';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { generatePath, matchRoutes, useNavigate, useParams, type RouteObject } from 'react-router';
import { z } from 'zod';
import { XMLView } from '@/application/runtime/XMLView';
import { useApiQuery } from '@/hooks/use-api';
import { fetchApiText } from '@/lib/api';
import type { Status } from '@/lib/generated/platform-api-v1/types.gen';
import { getIconComponent } from '@/lib/icons';
import NotFound from '@/platform/NotFound';
import {
    createContext as createXmlContext,
    parseXML,
    resolveRequestUrl,
    type ASTNode,
    type ExecutionContext,
} from '@/xml';
import XmlLayout from '@/xml/v1/layout';

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
    runtimeContext?: ExecutionContext;
    runtimeKey?: string;
};

type ErrorStateProps = {
    actionHref?: string;
    actionLabel?: string;
    isAlert?: boolean;
    message: string;
    title: string;
};

type LoadingStateProps = {
    status: 'creating' | 'loading';
};

type PageState = {
    cacheKey: string;
    path: string;
    routePath: string;
    ast: ASTNode[];
    error: string | null;
    loading: boolean;
    runtimeContext: ExecutionContext;
};

type PageRouteMatch = {
    page: RuntimePage;
    params: Record<string, string>;
};

type RuntimeRoute = RouteObject & {
    page: RuntimePage;
};

const emptyRouteParams: Record<string, string> = {};

/**
 * Removes leading and trailing slashes from a route path.
 */
function normalizePath(path: string): string {
    return path.replace(/^\/+|\/+$/g, '');
}

/** Returns the route pattern exposed by a runtime page. */
function pageRoutePattern(page: RuntimePage): string {
    return normalizePath(page.route);
}

/** Returns true when a page route contains dynamic path segments. */
function pageRouteIsDynamic(page: RuntimePage): boolean {
    return pageRoutePattern(page)
        .split('/')
        .some((segment) => segment.startsWith(':'));
}

/** Finds the best runtime page for the current app-relative browser path. */
function findPageRouteMatch(pages: RuntimePage[] | undefined, path: string): PageRouteMatch | null {
    const routes = (pages ?? []).map<RuntimeRoute>((page) => ({
        path: pageRoutePattern(page) || '/',
        page,
    }));
    const routePath = normalizePath(path);
    const [match] = matchRoutes(routes, `/${routePath}`) ?? [];

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
function resolveApplicationHref(routePath: string, organization?: string, application?: string): string {
    const normalizedRoutePath = normalizePath(routePath);
    const basePath =
        application && organization
            ? generatePath('/orgs/:organization/apps/:application', { organization, application })
            : organization
              ? generatePath('/orgs/:organization', { organization })
              : '';

    // Use the application root for empty routes.
    if (!normalizedRoutePath) {
        return basePath || '/';
    }

    return `${basePath}/${normalizedRoutePath}`;
}

/** Creates an isolated page runtime context while preserving supplied shared runtime values. */
function createPageRuntimeContext(runtimeContext?: ExecutionContext): ExecutionContext {
    const pageRuntimeContext = createXmlContext();

    // Start with an empty context when none is supplied.
    if (!runtimeContext) {
        return pageRuntimeContext;
    }

    // Copy only caller-provided shared context values.
    for (const [key, value] of Object.entries(runtimeContext)) {
        // Keep page-owned runtime slots isolated.
        if (key === 'invalidate' || key === 'setups' || key === 'values') {
            continue;
        }

        pageRuntimeContext[key] = value;
    }

    return pageRuntimeContext;
}

/** Creates the cached state holder for one browser-rendered page. */
function createPageState(
    key: string,
    path: string,
    routePath: string,
    params: Record<string, string>,
    navigationBaseUrl: string,
    runtimeContext?: ExecutionContext
): PageState {
    const pageRuntimeContext = createPageRuntimeContext(runtimeContext);

    pageRuntimeContext.params = params;
    pageRuntimeContext.navigationBaseUrl = navigationBaseUrl;

    return {
        cacheKey: key,
        path,
        routePath,
        ast: [],
        error: null,
        loading: true,
        runtimeContext: pageRuntimeContext,
    };
}

/**
 * Renders registered XML pages for Platform and Application routes.
 */
export default function View({
    applicationStatus,
    isApplicationLoading = false,
    pages,
    runtimeContext,
    runtimeKey,
}: ViewProps) {
    const t = useTranslator();
    const { organization, application, '*': wildcardPath } = useParams();
    const navigate = useNavigate();
    const [pageStates, setPageStates] = useState<Record<string, PageState>>({});
    const pageStatesRef = useRef<Record<string, PageState>>({});
    const inFlightPageKeysRef = useRef<Set<string>>(new Set());
    const runtimeContextRef = useRef<ExecutionContext | undefined>(runtimeContext);
    const resolvedPagesBaseUrl = pages.replace(/pages\.json(?:[?#].*)?$/i, '');
    const navigationBaseUrl = resolveApplicationHref('', organization, application);
    const pageCacheKey = `${pages}\u0000${runtimeKey ?? ''}`;
    const applicationCanLoad =
        !isApplicationLoading && (applicationStatus === undefined || applicationStatus === 'running');
    const {
        data: registeredPages,
        isLoading,
        error,
    } = useApiQuery<RuntimePage[]>(pages, {
        enabled: applicationCanLoad,
        parse: (value) => z.array(pageSchema).parse(value),
    });
    const normalizedRoutePath = normalizePath(wildcardPath ?? '');
    const activeRouteMatch = useMemo(
        () => findPageRouteMatch(registeredPages, normalizedRoutePath),
        [registeredPages, normalizedRoutePath]
    );
    const firstTabPage = registeredPages?.find((page) => !pageRouteIsDynamic(page));

    /* Resolve explicit browser routes first so dynamic detail views can share a tab with their list page. */
    const activePage = activeRouteMatch?.page ?? (!normalizedRoutePath ? firstTabPage : undefined);
    const activePagePath = activePage?.path;
    const activePageTab = activePage?.tab;
    const activeRouteParams = activeRouteMatch?.params ?? emptyRouteParams;

    const activePageStateKey = activePage
        ? `${activePage.path}\u0000${normalizedRoutePath}\u0000${activePage.tab}`
        : '';
    const activePageState = activePageStateKey ? pageStates[activePageStateKey] : undefined;
    const activePageStateIsCurrent =
        activePageState?.cacheKey === pageCacheKey &&
        activePageState.path === activePagePath &&
        activePageState.routePath === normalizedRoutePath;
    const isNotFound = Boolean(registeredPages && normalizedRoutePath && !activeRouteMatch);
    const fallbackActionProps = {
        actionHref: organization ? `/orgs/${organization}` : '/organizations',
        actionLabel: organization ? t('actions.backToOrganization') : t('actions.backToOrganizations'),
    };

    // Keep future page contexts aligned with the latest caller-supplied values.
    useEffect(() => {
        runtimeContextRef.current = runtimeContext;
    }, [runtimeContext]);

    // Make the first navigable tab explicit in the URL when the app loads without a selected view.
    useEffect(() => {
        // Skip redirects when the view is already selected.
        if (!firstTabPage || normalizedRoutePath) {
            return;
        }

        const firstPageRoute = pageRoutePattern(firstTabPage);

        // Keep root-routed tabs at the application root.
        if (firstPageRoute) {
            navigate(resolveApplicationHref(firstPageRoute, organization, application), { replace: true });
        }
    }, [application, firstTabPage, navigate, normalizedRoutePath, organization]);

    const tabs = useMemo(() => {
        const tabGroups = new Map<
            string,
            {
                active: boolean;
                href: string;
                icon?: LucideIcon;
                label: string;
            }
        >();

        // Build one visible navigation target per tab.
        for (const page of registeredPages ?? []) {
            const label = page.name || startCase(page.tab);
            const icon = page.icon ? getIconComponent(page.icon) : undefined;
            const routePattern = pageRoutePattern(page);
            const dynamic = pageRouteIsDynamic(page);
            const currentGroup = tabGroups.get(page.tab);

            // Keep existing tab groups active when any of their routes is active.
            if (currentGroup) {
                currentGroup.active = currentGroup.active || page.tab === activePageTab;
            }

            // Dynamic pages need concrete params, so they cannot be direct navigation targets.
            if (!routePattern || dynamic || currentGroup) {
                continue;
            }

            const href = resolveApplicationHref(routePattern, organization, application);

            // Prefer static pages as tab targets because dynamic routes need concrete parameter values.
            tabGroups.set(page.tab, {
                active: page.tab === activePageTab,
                href,
                icon,
                label,
            });
        }

        return Object.fromEntries(
            Array.from(tabGroups.values()).map((tab) => [
                tab.label,
                { active: tab.active, href: tab.href, icon: tab.icon },
            ])
        );
    }, [activePageTab, application, organization, registeredPages]);

    /* Load each page once for the active route instance. */
    useEffect(() => {
        // Skip page loading until an active page can render.
        if (!applicationCanLoad || !activePage) {
            return;
        }

        const pagePath = activePage.path;
        const pageKey = `${pageCacheKey}\u0000${activePageStateKey}`;
        const existingPageState = pageStatesRef.current[activePageStateKey];
        const inFlightPageKeys = inFlightPageKeysRef.current;

        // Reuse completed page state for matching route instances.
        if (
            existingPageState?.cacheKey === pageCacheKey &&
            existingPageState.path === activePagePath &&
            existingPageState.routePath === normalizedRoutePath &&
            !existingPageState.loading
        ) {
            return;
        }

        // Avoid duplicate requests for the same page state.
        if (
            existingPageState?.cacheKey === pageCacheKey &&
            existingPageState.path === activePagePath &&
            existingPageState.routePath === normalizedRoutePath &&
            inFlightPageKeys.has(pageKey)
        ) {
            return;
        }

        const loadingPageState = createPageState(
            pageCacheKey,
            pagePath,
            normalizedRoutePath,
            activeRouteParams,
            navigationBaseUrl,
            runtimeContextRef.current
        );
        let pageUrl: string;

        // Validate registered page paths before fetch so an app cannot request external URLs.
        try {
            pageUrl = resolveRequestUrl(resolvedPagesBaseUrl, pagePath);
        } catch (urlError: unknown) {
            const errorPageState = {
                ...loadingPageState,
                error: urlError instanceof Error ? urlError.message : t('appView.invalidPageUrl'),
                loading: false,
            };

            setPageStates((current) => {
                const next = { ...current, [activePageStateKey]: errorPageState };

                pageStatesRef.current = next;

                return next;
            });

            return;
        }

        const controller = new AbortController();

        inFlightPageKeys.add(pageKey);
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
                        const currentPageState = current[activePageStateKey];

                        // Keep stale responses from replacing newer page state.
                        if (
                            currentPageState?.cacheKey !== pageCacheKey ||
                            currentPageState.path !== activePagePath ||
                            currentPageState.routePath !== normalizedRoutePath
                        ) {
                            return current;
                        }

                        const next = {
                            ...current,
                            [activePageStateKey]: {
                                ...currentPageState,
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
                    const currentPageState = current[activePageStateKey];

                    // Keep stale failures from replacing newer page state.
                    if (
                        currentPageState?.cacheKey !== pageCacheKey ||
                        currentPageState.path !== activePagePath ||
                        currentPageState.routePath !== normalizedRoutePath
                    ) {
                        return current;
                    }

                    const next = {
                        ...current,
                        [activePageStateKey]: {
                            ...currentPageState,
                            error: fetchError instanceof Error ? fetchError.message : t('appView.loadPageFailed'),
                            loading: false,
                        },
                    };

                    pageStatesRef.current = next;

                    return next;
                });
            })
            .finally(() => {
                inFlightPageKeys.delete(pageKey);
            });

        return () => {
            controller.abort();
            inFlightPageKeys.delete(pageKey);
        };
    }, [
        activePage,
        activePagePath,
        activePageStateKey,
        activeRouteParams,
        normalizedRoutePath,
        applicationCanLoad,
        navigationBaseUrl,
        pageCacheKey,
        resolvedPagesBaseUrl,
        t,
    ]);

    // Show deployment loading only while status or access is still resolving.
    if (isApplicationLoading || applicationStatus === 'creating') {
        return (
            <XmlLayout tabs={tabs}>
                <Center minHeight="calc(100vh - 14rem)" width="100%">
                    <LoadingState status={isApplicationLoading ? 'loading' : 'creating'} />
                </Center>
            </XmlLayout>
        );
    }

    // Keep failed and deleting applications out of the runtime while surfacing their lifecycle state.
    if (applicationStatus === 'failed' || applicationStatus === 'deleting') {
        return (
            <XmlLayout tabs={tabs}>
                <Center minHeight="calc(100vh - 14rem)" width="100%">
                    <ErrorState
                        {...fallbackActionProps}
                        isAlert={applicationStatus === 'failed'}
                        message={
                            applicationStatus === 'failed'
                                ? t('appView.applicationDeploymentFailedDescription')
                                : t('appView.applicationDeletingDescription')
                        }
                        title={
                            applicationStatus === 'failed'
                                ? t('appView.applicationDeploymentFailed')
                                : t('appView.applicationDeleting')
                        }
                    />
                </Center>
            </XmlLayout>
        );
    }

    // Surface page manifest loading failures in the shell.
    if (error) {
        return (
            <XmlLayout tabs={tabs}>
                <Center minHeight="calc(100vh - 14rem)" width="100%">
                    <ErrorState
                        {...fallbackActionProps}
                        message={error.message || t('appView.loadApplicationFailed')}
                        title={t('appView.unableToLoadApplication')}
                    />
                </Center>
            </XmlLayout>
        );
    }

    // Delegate unknown app routes to the shared 404 page.
    if (isNotFound) {
        return <NotFound />;
    }

    const activePageError = activePageState?.error;
    const renderedPagePanels = Object.entries(pageStates).map(([pageStateKey, pageState]) => {
        // Render only valid page panels from the current cache.
        if (!pageState.ast.length || pageState.cacheKey !== pageCacheKey || pageState.error) {
            return null;
        }

        const pageIsActive = pageStateKey === activePageStateKey;

        return (
            <Stack key={pageStateKey} as="section" gap={6} hidden={!pageIsActive} aria-hidden={!pageIsActive}>
                <XMLView
                    active={pageIsActive}
                    ast={pageState.ast}
                    baseUrl={resolvedPagesBaseUrl}
                    context={pageState.runtimeContext}
                    runtimeKey={runtimeKey}
                    stateKey={pageStateKey}
                />
            </Stack>
        );
    });

    let activeFallback: ReactNode = null;

    // Choose the visible fallback for the active page.
    if (!activePage) {
        activeFallback = (
            <ErrorState
                {...fallbackActionProps}
                message={t('appView.emptyApplication')}
                title={t('appView.unexpectedApplicationResponse')}
            />
        );
    } else if (activePageStateIsCurrent && activePageError) {
        activeFallback = (
            <ErrorState {...fallbackActionProps} message={activePageError} title={t('appView.unableToLoadPage')} />
        );
    } else if (isLoading || !activePageStateIsCurrent || activePageState.loading) {
        activeFallback = <LoadingState status="loading" />;
    } else if (!activePageState.ast.length) {
        activeFallback = (
            <ErrorState
                {...fallbackActionProps}
                message={t('appView.emptyResponse')}
                title={t('appView.unexpectedApplicationResponse')}
            />
        );
    }

    return (
        <XmlLayout tabs={tabs}>
            {renderedPagePanels}
            {activeFallback ? (
                <Center minHeight="calc(100vh - 14rem)" width="100%">
                    {activeFallback}
                </Center>
            ) : null}
        </XmlLayout>
    );
}

/** Renders the in-shell loading page while an application is being created. */
function LoadingState({ status }: LoadingStateProps) {
    const t = useTranslator();

    // Keep the shell visible while the page manifest or active page is loading.
    if (status === 'loading') return <Spinner label="Loading" />;

    return (
        <Card maxWidth={576} padding={6} width="100%">
            <EmptyState
                description={t('appView.retryLater')}
                headingLevel={1}
                title={t('appView.applicationIsDeploying')}
            />
        </Card>
    );
}

/** Renders a centered in-shell application state message. */
function ErrorState({ actionHref, actionLabel, isAlert = true, message, title }: ErrorStateProps) {
    return (
        <Card maxWidth={576} padding={6} width="100%">
            <EmptyState
                actions={
                    actionHref && actionLabel ? (
                        <Button href={actionHref} label={actionLabel} variant="primary" />
                    ) : undefined
                }
                description={message}
                headingLevel={1}
                role={isAlert ? 'alert' : undefined}
                title={title}
            />
        </Card>
    );
}
