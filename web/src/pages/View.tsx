import startCase from 'lodash/startCase';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { generatePath, Link, matchRoutes, useNavigate, useParams, type RouteObject } from 'react-router';
import type { ApiOrganizationApplication } from '@/lib/types';
import XML from '@/layout/XmlLayout';
import { useTranslation } from '@/lib/i18n';
import { ApiError, fetchApiText } from '@/lib/api';
import { buttonVariants } from '@/components/ui/button';
import { usePages, type RuntimePage } from '@/hooks/use-pages';
import { createLucideIconComponent } from '@/components/ui/icon';
import {
    createContext as createXmlContext,
    fromXml,
    RenderXML,
    resolveRequestUrl,
    type ASTNode,
    type ExecutionContext,
} from '@/xml';
import NotFound from './NotFound';

type ViewProps = {
    applicationStatus?: ApiOrganizationApplication['status'] | 'loading';
    locale?: string;
    pages: string;
    runtimeContext?: ExecutionContext;
    runtimeKey?: string;
};

type ErrorStateProps = {
    actionHref?: string;
    actionLabel?: string;
    message: string;
    title: string;
};

type LoadingStateProps = {
    status: ApiOrganizationApplication['status'] | 'loading';
};

type PageState = {
    cacheKey: string;
    path: string;
    routePath: string;
    stateKey: string;
    ast: ASTNode[] | null;
    parseError: string | null;
    error: string | null;
    status: number | null;
    loading: boolean;
    runtimeContext: ExecutionContext;
};

type PageParseResult = {
    ast: ASTNode[] | null;
    parseError: string | null;
};

type PageRouteMatch = {
    page: RuntimePage;
    params: Record<string, string>;
    path: string;
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
export function pageRoutePattern(page: RuntimePage): string {
    return normalizePath(page.route);
}

/** Returns true when a page route contains dynamic path segments. */
function pageRouteIsDynamic(page: RuntimePage): boolean {
    return pageRoutePattern(page)
        .split('/')
        .some((segment) => segment.startsWith(':'));
}

/** Finds the best runtime page for the current app-relative browser path. */
export function findPageRouteMatch(pages: RuntimePage[] | undefined, path: string): PageRouteMatch | null {
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
        path: routePath,
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

/** Resolves route params inside a URL template. */
function resolveTemplate(template: string, params: Record<string, string | undefined>): string {
    const resolvedTemplate = template.includes('/:') ? generatePath(template, params) : template;

    return resolvedTemplate.replace(/\{([A-Za-z0-9_]+)\}/g, (_, key: string) => params[key] ?? `{${key}}`);
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

/** Creates the cached state holder for one XML page. */
function createPageState(
    key: string,
    stateKey: string,
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
        stateKey,
        ast: null,
        error: null,
        loading: false,
        parseError: null,
        status: null,
        runtimeContext: pageRuntimeContext,
    };
}

/** Parses page XML once so route rendering does not throw on malformed application XML. */
function parsePageContent(content: string): PageParseResult {
    // Parse XML defensively so render can show errors.
    try {
        return { ast: fromXml(content), parseError: null };
    } catch (unknownError) {
        return {
            ast: null,
            parseError: unknownError instanceof Error ? unknownError.message : 'Failed to parse page XML',
        };
    }
}

/**
 * Renders registered XML pages for platform and application routes.
 */
export default function View({ applicationStatus, locale, pages, runtimeContext, runtimeKey }: ViewProps) {
    const { t } = useTranslation();
    const { organization, application, '*': wildcardPath } = useParams();
    const navigate = useNavigate();
    const [pageStates, setPageStates] = useState<Record<string, PageState>>({});
    const pageStatesRef = useRef<Record<string, PageState>>({});
    const inFlightPageKeysRef = useRef<Set<string>>(new Set());
    const runtimeContextRef = useRef<ExecutionContext | undefined>(runtimeContext);
    const routeParams: Record<string, string | undefined> = { organization, application };
    const resolvedPages = resolveTemplate(pages, routeParams);
    const resolvedPagesBaseUrl = resolvedPages.replace(/pages\.json(?:[?#].*)?$/i, '');
    const navigationBaseUrl = resolveApplicationHref('', organization, application);
    const pageCacheKey = `${resolvedPages}\u0000${runtimeKey ?? ''}`;
    const applicationIsLoading = applicationStatus !== undefined && applicationStatus !== 'running';
    const { data: registeredPages, isLoading, error } = usePages(resolvedPages, !applicationIsLoading);
    const normalizedRoutePath = normalizePath(wildcardPath ?? '');
    const activeRouteMatch = useMemo(
        () => findPageRouteMatch(registeredPages, normalizedRoutePath),
        [registeredPages, normalizedRoutePath]
    );
    /* Resolve explicit browser routes first so dynamic detail views can share a tab with their list page. */
    const activePage = activeRouteMatch?.page ?? (!normalizedRoutePath ? registeredPages?.[0] : undefined);
    const activePagePath = activePage?.path;
    const activePageTab = activePage?.tab;
    let activeRoutePath = normalizedRoutePath;
    let activeRouteParams = emptyRouteParams;

    // Use route params only when the matched page is active.
    if (activeRouteMatch && activeRouteMatch.page === activePage) {
        activeRoutePath = activeRouteMatch.path;
        activeRouteParams = activeRouteMatch.params;
    }

    const activePageStateKey = activePage ? `${activePage.path}\u0000${activeRoutePath}\u0000${activePage.tab}` : '';
    const activePageState = activePageStateKey ? pageStates[activePageStateKey] : undefined;
    const activePageStateIsCurrent =
        activePageState?.cacheKey === pageCacheKey &&
        activePageState.path === activePagePath &&
        activePageState.routePath === activeRoutePath;
    const isNotFound = Boolean(registeredPages && normalizedRoutePath && !activeRouteMatch);
    const pagesLoading = error instanceof ApiError && error.status === 503;

    runtimeContextRef.current = runtimeContext;

    useEffect(() => {
        pageStatesRef.current = {};
        inFlightPageKeysRef.current.clear();
        setPageStates({});
    }, [pageCacheKey]);

    // Make the first page explicit in the URL when the app loads without a selected view.
    useEffect(() => {
        // Skip redirects when the view is already selected.
        if (!registeredPages?.length || normalizedRoutePath) {
            return;
        }

        const firstPage = registeredPages[0];
        const firstPageRoute = pageRoutePattern(firstPage);

        // Prefer route navigation for static page routes.
        if (firstPageRoute && !pageRouteIsDynamic(firstPage)) {
            navigate(resolveApplicationHref(firstPageRoute, organization, application), { replace: true });
        }
    }, [application, navigate, normalizedRoutePath, organization, registeredPages]);

    const tabs = useMemo(() => {
        const tabGroups = new Map<
            string,
            {
                active: boolean;
                href: string;
                icon?: ReturnType<typeof createLucideIconComponent>;
                label: string;
            }
        >();

        // Build one visible navigation target per tab.
        for (const page of registeredPages ?? []) {
            const label = page.name?.trim() || startCase(page.tab);
            const iconName = page.icon?.trim();
            const icon = iconName ? createLucideIconComponent(iconName) : undefined;
            const routePattern = pageRoutePattern(page);
            const dynamic = pageRouteIsDynamic(page);
            const currentGroup = tabGroups.get(page.tab);

            // Dynamic pages need concrete params, so they cannot be direct navigation targets.
            if (!routePattern || dynamic) {
                if (currentGroup) {
                    currentGroup.active = currentGroup.active || page.tab === activePageTab;
                }
                continue;
            }

            const href = resolveApplicationHref(routePattern, organization, application);

            // Prefer static pages as tab targets because dynamic routes need concrete parameter values.
            if (!currentGroup) {
                tabGroups.set(page.tab, {
                    active: page.tab === activePageTab,
                    href,
                    icon,
                    label,
                });
                continue;
            }

            currentGroup.active = currentGroup.active || page.tab === activePageTab;
        }

        return Object.fromEntries(
            Array.from(tabGroups.values()).map((tab) => [
                tab.label,
                tab.icon
                    ? { active: tab.active, href: tab.href, icon: tab.icon }
                    : { active: tab.active, href: tab.href },
            ])
        );
    }, [activePageTab, application, organization, registeredPages]);

    /* Load each XML page once for the active route instance. */
    useEffect(() => {
        // Skip page loading until an XML page can render.
        if (applicationIsLoading || !activePageTab || !activePageStateKey || activePagePath === undefined) {
            return;
        }

        const pageKey = `${pageCacheKey}\u0000${activePageStateKey}`;
        const existingPageState = pageStatesRef.current[activePageStateKey];

        // Reuse completed page state for matching route instances.
        if (
            existingPageState?.cacheKey === pageCacheKey &&
            existingPageState.path === activePagePath &&
            existingPageState.routePath === activeRoutePath &&
            (existingPageState.ast !== null ||
                existingPageState.error !== null ||
                existingPageState.parseError !== null)
        ) {
            return;
        }

        // Avoid duplicate requests for the same page state.
        if (
            existingPageState?.cacheKey === pageCacheKey &&
            existingPageState.path === activePagePath &&
            existingPageState.routePath === activeRoutePath &&
            inFlightPageKeysRef.current.has(pageKey)
        ) {
            return;
        }

        const loadingPageState = {
            ...createPageState(
                pageCacheKey,
                activePageStateKey,
                activePagePath,
                activeRoutePath,
                activeRouteParams,
                navigationBaseUrl,
                runtimeContextRef.current
            ),
            loading: true,
        };
        let pageUrl: string;

        // Validate registered page paths before fetch so an app cannot request external URLs.
        try {
            pageUrl = resolveRequestUrl(resolvedPagesBaseUrl, activePagePath);
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

        inFlightPageKeysRef.current.add(pageKey);
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
                    const { ast, parseError } = parsePageContent(content);

                    setPageStates((current) => {
                        const currentPageState = current[activePageStateKey];

                        // Keep stale responses from replacing newer page state.
                        if (
                            currentPageState?.cacheKey !== pageCacheKey ||
                            currentPageState.path !== activePagePath ||
                            currentPageState.routePath !== activeRoutePath
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
                                parseError,
                                status: null,
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
                        currentPageState.routePath !== activeRoutePath
                    ) {
                        return current;
                    }

                    const next = {
                        ...current,
                        [activePageStateKey]: {
                            ...currentPageState,
                            error: fetchError instanceof Error ? fetchError.message : t('appView.loadPageFailed'),
                            loading: false,
                            status: fetchError instanceof ApiError ? fetchError.status : null,
                        },
                    };

                    pageStatesRef.current = next;

                    return next;
                });
            })
            .finally(() => {
                inFlightPageKeysRef.current.delete(pageKey);
            });

        return () => {
            controller.abort();
            inFlightPageKeysRef.current.delete(pageKey);
        };
    }, [
        activePagePath,
        activePageStateKey,
        activePageTab,
        activeRouteParams,
        activeRoutePath,
        applicationIsLoading,
        navigationBaseUrl,
        pageCacheKey,
        resolvedPagesBaseUrl,
    ]);

    // Show deployment loading before rendering runtime pages.
    if (applicationIsLoading || pagesLoading) {
        return (
            <XML tabs={tabs}>
                <section className="flex min-h-[calc(100vh-14rem)] items-center justify-center px-6 py-12">
                    <LoadingState status={applicationStatus ?? 'loading'} />
                </section>
            </XML>
        );
    }

    // Surface page manifest loading failures in the shell.
    if (error) {
        return (
            <XML tabs={tabs}>
                <section className="flex min-h-[calc(100vh-14rem)] items-center justify-center px-6 py-12">
                    <ErrorState
                        actionHref={organization ? `/orgs/${organization}` : '/organizations'}
                        actionLabel={organization ? t('actions.backToOrganization') : t('actions.backToOrganizations')}
                        message={error.message || t('appView.loadApplicationFailed')}
                        title={t('appView.unableToLoadApplication')}
                    />
                </section>
            </XML>
        );
    }

    // Delegate unknown app routes to the shared 404 page.
    if (isNotFound) {
        return <NotFound />;
    }

    const renderedPagePanels = Object.values(pageStates).map((pageState) => {
        // Render only valid page panels from the current cache.
        if (!pageState.ast || pageState.cacheKey !== pageCacheKey || pageState.error || pageState.parseError) {
            return null;
        }

        const pageIsActive = pageState.stateKey === activePageStateKey;

        return (
            <section key={pageState.stateKey} hidden={!pageIsActive} aria-hidden={!pageIsActive} className="space-y-6">
                <RenderXML
                    key={`${runtimeKey ?? 'runtime'}-${pageState.stateKey}`}
                    active={pageIsActive}
                    ast={pageState.ast}
                    baseUrl={resolvedPagesBaseUrl}
                    ctx={pageState.runtimeContext}
                    locale={locale}
                />
            </section>
        );
    });

    let activeFallback: ReactNode = null;

    // Choose the visible fallback for the active page.
    if (!activePage) {
        activeFallback = (
            <ErrorState
                actionHref={organization ? `/orgs/${organization}` : '/organizations'}
                actionLabel={organization ? t('actions.backToOrganization') : t('actions.backToOrganizations')}
                message={t('appView.emptyApplication')}
                title={t('appView.unexpectedApplicationResponse')}
            />
        );
    } else if (activePageStateIsCurrent && activePageState.error && activePageState.status === 503) {
        activeFallback = <LoadingState status={applicationStatus ?? 'loading'} />;
    } else if (activePageStateIsCurrent && activePageState.error) {
        activeFallback = (
            <ErrorState
                actionHref={organization ? `/orgs/${organization}` : '/organizations'}
                actionLabel={organization ? t('actions.backToOrganization') : t('actions.backToOrganizations')}
                message={activePageState.error || t('appView.loadPageFailed')}
                title={t('appView.unableToLoadPage')}
            />
        );
    } else if (activePageStateIsCurrent && activePageState.parseError) {
        activeFallback = (
            <ErrorState
                actionHref={organization ? `/orgs/${organization}` : '/organizations'}
                actionLabel={organization ? t('actions.backToOrganization') : t('actions.backToOrganizations')}
                message={activePageState.parseError}
                title={t('appView.unableToLoadPage')}
            />
        );
    } else if (isLoading || !activePageStateIsCurrent || activePageState.loading) {
        activeFallback = <LoadingState status="loading" />;
    } else if (!activePageState.ast) {
        activeFallback = (
            <ErrorState
                actionHref={organization ? `/orgs/${organization}` : '/organizations'}
                actionLabel={organization ? t('actions.backToOrganization') : t('actions.backToOrganizations')}
                message={t('appView.emptyResponse')}
                title={t('appView.unexpectedApplicationResponse')}
            />
        );
    }

    return (
        <XML tabs={tabs}>
            {renderedPagePanels}
            {activeFallback ? (
                <section className="flex min-h-[calc(100vh-14rem)] items-center justify-center px-6 py-12">
                    {activeFallback}
                </section>
            ) : null}
        </XML>
    );
}

/** Renders the in-shell loading page for an application that is not ready yet. */
function LoadingState({ status }: LoadingStateProps) {
    const { t } = useTranslation();

    // Hide the loading shell when status is unresolved.
    if (status === 'loading') return null;

    return (
        <div className="w-full max-w-xl rounded-2xl border border-border bg-card/80 px-6 py-8 text-center shadow-sm">
            <div className="space-y-3">
                <h1 className="text-2xl font-semibold text-foreground">
                    {t('appView.applicationIsStatus', { status })}
                </h1>
                <p className="text-sm leading-6 text-muted-foreground">{t('appView.retryLater')}</p>
            </div>
        </div>
    );
}

/** Renders a centered in-shell error message for failed application loads. */
function ErrorState({ actionHref, actionLabel, message, title }: ErrorStateProps) {
    return (
        <div className="w-full max-w-xl rounded-2xl border border-border bg-card/80 px-6 py-8 text-center shadow-sm">
            <div className="space-y-3">
                <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
                <p className="text-sm leading-6 text-muted-foreground">{message}</p>
            </div>

            {actionHref && actionLabel ? (
                <div className="mt-6 flex items-center justify-center gap-3">
                    <Link to={actionHref} className={buttonVariants()}>
                        {actionLabel}
                    </Link>
                </div>
            ) : null}
        </div>
    );
}
