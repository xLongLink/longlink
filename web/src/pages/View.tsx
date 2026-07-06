import { createLucideIconComponent } from '@/components/ui/icon';
import { useMetadata, type MetadataPage } from '@/hooks/use-metadata';
import XML from '@/layout/XmlLayout';
import { ApiError, fetchApiText } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import type { ApiOrganizationApplication } from '@/lib/types';
import {
    createContext as createXmlContext,
    fromXml,
    RenderXML,
    resolveRequestUrl,
    type ASTNode,
    type ExecutionContext,
} from '@/xml';
import { buttonVariants } from '@ui/button';
import { ScrollArea } from '@ui/scroll-area';
import startCase from 'lodash/startCase';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import NotFound from './NotFound';

type ViewProps = {
    applicationId?: string;
    applicationName?: string;
    applicationStatus?: ApiOrganizationApplication['status'] | 'loading';
    canViewLogs?: boolean;
    metadata: string;
    locale?: string;
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

type LogsStateProps = {
    applicationId: string;
    applicationName: string;
};

type PageState = {
    cacheKey: string;
    path: string;
    routePath: string;
    stateKey: string;
    tab: string;
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
    page: MetadataPage;
    params: Record<string, string>;
    path: string;
    score: number;
};

type LogsState = {
    content: string;
    error: string | null;
    loading: boolean;
};

const emptyLogsState: LogsState = {
    content: '',
    error: null,
    loading: false,
};
const emptyRouteParams: Record<string, string> = {};

/**
 * Removes leading and trailing slashes from a route path.
 */
function normalizePath(path: string): string {
    return path.replace(/^\/+|\/+$/g, '');
}

/** Returns the route pattern exposed by metadata, falling back to older tab-only metadata. */
export function pageRoutePattern(page: MetadataPage): string {
    return normalizePath(page.route ?? page.tab);
}

/** Returns true when a metadata route contains dynamic path segments. */
function pageRouteIsDynamic(page: MetadataPage): boolean {
    return pageRoutePattern(page)
        .split('/')
        .some((segment) => segment.startsWith(':'));
}

/** Matches one browser path against a metadata route pattern. */
function matchRoutePattern(pattern: string, path: string): Omit<PageRouteMatch, 'page'> | null {
    const routePattern = normalizePath(pattern);
    const routePath = normalizePath(path);

    if (!routePattern && !routePath) {
        return { params: {}, path: routePath, score: 0 };
    }

    const patternSegments = routePattern.split('/').filter(Boolean);
    const pathSegments = routePath.split('/').filter(Boolean);

    if (patternSegments.length !== pathSegments.length) {
        return null;
    }

    const params: Record<string, string> = {};
    let score = 0;

    for (let index = 0; index < patternSegments.length; index += 1) {
        const patternSegment = patternSegments[index];
        const pathSegment = pathSegments[index];

        // Static segments outrank dynamic segments so exact page routes win first.
        if (!patternSegment.startsWith(':')) {
            if (patternSegment !== pathSegment) {
                return null;
            }

            score += 2;
            continue;
        }

        const parameterName = patternSegment.slice(1);

        if (!parameterName || !pathSegment) {
            return null;
        }

        params[parameterName] = pathSegment;
        score += 1;
    }

    return { params, path: routePath, score };
}

/** Finds the best metadata page for the current app-relative browser path. */
export function findPageRouteMatch(pages: MetadataPage[] | undefined, path: string): PageRouteMatch | null {
    let bestMatch: PageRouteMatch | null = null;

    for (const page of pages ?? []) {
        const match = matchRoutePattern(pageRoutePattern(page), path);

        if (!match) {
            continue;
        }

        if (!bestMatch || match.score > bestMatch.score) {
            bestMatch = { ...match, page };
        }
    }

    return bestMatch;
}

/** Finds the preferred page for one tab, preferring static pages over dynamic detail pages. */
export function findPageTabMatch(pages: MetadataPage[] | undefined, tab: string | null): MetadataPage | undefined {
    if (!tab) {
        return undefined;
    }

    const tabPages = pages?.filter((page) => page.tab === tab) ?? [];

    return tabPages.find((page) => !pageRouteIsDynamic(page)) ?? tabPages[0];
}

/** Builds an app-shell href for one metadata route path. */
function resolveApplicationHref(routePath: string, organization?: string, application?: string): string {
    const normalizedRoutePath = normalizePath(routePath);
    const basePath = application
        ? `/orgs/${organization}/apps/${application}`
        : organization
          ? `/orgs/${organization}`
          : '';

    if (!normalizedRoutePath) {
        return basePath || '/';
    }

    return `${basePath}/${normalizedRoutePath}`;
}

/** Builds the legacy query-string href for one metadata tab. */
function resolveTabHref(tab: string, organization?: string, application?: string): string {
    const query = new URLSearchParams({ tab });
    const basePath = resolveApplicationHref('', organization, application);

    return `${basePath === '/' ? '' : basePath}?${query.toString()}`;
}

/** Resolves route params inside a URL template. */
function resolveTemplate(template: string, params: Record<string, string | undefined>): string {
    return template
        .replace(/:([A-Za-z0-9_]+)/g, (_, key: string) => params[key] ?? `:${key}`)
        .replace(/\{([A-Za-z0-9_]+)\}/g, (_, key: string) => params[key] ?? `{${key}}`);
}

/** Creates an isolated page runtime context while preserving shared runtime values like the user. */
function createPageRuntimeContext(runtimeContext?: ExecutionContext): ExecutionContext {
    const pageRuntimeContext = createXmlContext();

    if (!runtimeContext) {
        return pageRuntimeContext;
    }

    for (const [key, value] of Object.entries(runtimeContext)) {
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
    tab: string,
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
        tab,
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
 * Renders metadata-backed XML pages for control-plane and application routes.
 */
export default function View({
    applicationId,
    applicationName,
    applicationStatus,
    canViewLogs = false,
    locale,
    metadata,
    runtimeContext,
    runtimeKey,
}: ViewProps) {
    const { t } = useTranslation();
    const { organization, application, '*': wildcardPath } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [pageStates, setPageStates] = useState<Record<string, PageState>>({});
    const [logsState, setLogsState] = useState<LogsState>(emptyLogsState);
    const pageStatesRef = useRef<Record<string, PageState>>({});
    const inFlightPageKeysRef = useRef<Set<string>>(new Set());
    const runtimeContextRef = useRef<ExecutionContext | undefined>(runtimeContext);
    const routeParams = { organization, application } as Record<string, string | undefined>;
    const resolvedMetadata = resolveTemplate(metadata, routeParams);
    const resolvedMetadataBaseUrl = resolvedMetadata.replace(/metadata\.json(?:[?#].*)?$/i, '');
    const navigationBaseUrl = resolveApplicationHref('', organization, application);
    const pageCacheKey = `${resolvedMetadata}\u0000${runtimeKey ?? ''}`;
    const applicationIsLoading = applicationStatus !== undefined && applicationStatus !== 'running';
    const { data: metadataDocument, isLoading, error } = useMetadata(resolvedMetadata, !applicationIsLoading);
    const normalizedRoutePath = normalizePath(wildcardPath ?? '');
    const selectedTab = searchParams.get('tab');
    const activeRouteMatch = useMemo(
        () => findPageRouteMatch(metadataDocument?.pages, normalizedRoutePath),
        [metadataDocument?.pages, normalizedRoutePath]
    );
    const selectedTabPage = findPageTabMatch(metadataDocument?.pages, selectedTab);
    /* Resolve explicit browser routes first so dynamic detail views can share a tab with their list page. */
    const activePage =
        activeRouteMatch?.page ?? selectedTabPage ?? (!normalizedRoutePath ? metadataDocument?.pages?.[0] : undefined);
    const activePagePath = activePage?.path;
    const activePageTab = activePage?.tab;
    let activeRoutePath = normalizedRoutePath;
    let activeRouteParams = emptyRouteParams;

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
    const isNotFound =
        metadataDocument === null || Boolean(metadataDocument?.pages && normalizedRoutePath && !activeRouteMatch);
    const metadataLoading = error instanceof ApiError && error.status === 503;
    const shouldShowLogs =
        canViewLogs &&
        applicationStatus === 'running' &&
        (metadataLoading || (activePageStateIsCurrent && activePageState.status === 503));

    runtimeContextRef.current = runtimeContext;

    useEffect(() => {
        pageStatesRef.current = {};
        inFlightPageKeysRef.current.clear();
        setPageStates({});
    }, [pageCacheKey]);

    // Make the first page explicit in the URL when the app loads without a selected view.
    useEffect(() => {
        if (!metadataDocument?.pages?.length || selectedTab || normalizedRoutePath) {
            return;
        }

        const firstPage = metadataDocument.pages[0];
        const firstPageRoute = pageRoutePattern(firstPage);

        if (firstPage.route != null && firstPageRoute && !pageRouteIsDynamic(firstPage)) {
            navigate(resolveApplicationHref(firstPageRoute, organization, application), { replace: true });
            return;
        }

        const query = new URLSearchParams({ tab: firstPage.tab });

        navigate(`?${query.toString()}`, { replace: true });
    }, [application, metadataDocument?.pages, navigate, normalizedRoutePath, organization, selectedTab]);

    const tabs = useMemo(() => {
        const tabGroups = new Map<
            string,
            {
                active: boolean;
                dynamic: boolean;
                href: string;
                icon?: ReturnType<typeof createLucideIconComponent>;
                label: string;
            }
        >();

        for (const page of metadataDocument?.pages ?? []) {
            const label = page.name?.trim() || startCase(page.tab);
            const iconName = page.icon?.trim();
            const icon = iconName ? createLucideIconComponent(iconName) : undefined;
            const routePattern = pageRoutePattern(page);
            const dynamic = pageRouteIsDynamic(page);
            const href =
                page.route != null && routePattern && !dynamic
                    ? resolveApplicationHref(routePattern, organization, application)
                    : resolveTabHref(page.tab, organization, application);
            const currentGroup = tabGroups.get(page.tab);

            // Prefer static pages as tab targets because dynamic routes need concrete parameter values.
            if (!currentGroup || (currentGroup.dynamic && !dynamic)) {
                tabGroups.set(page.tab, {
                    active: page.tab === activePageTab,
                    dynamic,
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
    }, [activePageTab, application, metadataDocument?.pages, organization]);

    /* Load each XML page once for the active route instance. */
    useEffect(() => {
        if (
            shouldShowLogs ||
            applicationIsLoading ||
            !activePageTab ||
            !activePageStateKey ||
            activePagePath === undefined
        ) {
            return;
        }

        const pageKey = `${pageCacheKey}\u0000${activePageStateKey}`;
        const existingPageState = pageStatesRef.current[activePageStateKey];

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
                activePageTab,
                activeRouteParams,
                navigationBaseUrl,
                runtimeContextRef.current
            ),
            loading: true,
        };
        let pageUrl: string;

        // Validate metadata page paths before fetch so app metadata cannot request external URLs.
        try {
            pageUrl = resolveRequestUrl(resolvedMetadataBaseUrl, activePagePath);
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
                if (!controller.signal.aborted) {
                    const { ast, parseError } = parsePageContent(content);

                    setPageStates((current) => {
                        const currentPageState = current[activePageStateKey];

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
                if (controller.signal.aborted) {
                    return;
                }

                setPageStates((current) => {
                    const currentPageState = current[activePageStateKey];

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
        resolvedMetadataBaseUrl,
        shouldShowLogs,
    ]);

    // Fetch logs only when the current user is allowed to inspect a running application.
    useEffect(() => {
        if (!shouldShowLogs || !applicationId) {
            setLogsState(emptyLogsState);
            return;
        }

        const controller = new AbortController();

        setLogsState({ ...emptyLogsState, loading: true });

        void fetchApiText(`/api/applications/${applicationId}/logs`, { signal: controller.signal })
            .then((content) => {
                if (!controller.signal.aborted) {
                    setLogsState({ ...emptyLogsState, content });
                }
            })
            .catch((fetchError: unknown) => {
                if (controller.signal.aborted) {
                    return;
                }

                setLogsState({
                    ...emptyLogsState,
                    error: fetchError instanceof Error ? fetchError.message : t('appView.loadLogsFailed'),
                });
            });

        return () => controller.abort();
    }, [applicationId, shouldShowLogs]);

    if (applicationIsLoading || (metadataLoading && !shouldShowLogs)) {
        return (
            <XML tabs={tabs}>
                <section className="flex min-h-[calc(100vh-14rem)] items-center justify-center px-6 py-12">
                    <LoadingState status={applicationStatus ?? 'loading'} />
                </section>
            </XML>
        );
    }

    if (shouldShowLogs) {
        return (
            <XML tabs={tabs}>
                <section className="px-6 py-10">
                    <LogsState
                        applicationId={applicationId ?? ''}
                        applicationName={applicationName ?? application ?? 'Application'}
                        logsContent={logsState.content}
                        logsError={logsState.error}
                        logsLoading={logsState.loading}
                    />
                </section>
            </XML>
        );
    }

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

    if (isNotFound) {
        return <NotFound />;
    }

    const renderedPagePanels = Object.values(pageStates).map((pageState) => {
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
                    baseUrl={resolvedMetadataBaseUrl}
                    ctx={pageState.runtimeContext}
                    locale={locale}
                />
            </section>
        );
    });

    let activeFallback: ReactNode = null;

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

/** Renders the logs view for administrators while an application is unavailable. */
function LogsState({
    applicationName,
    logsContent,
    logsError,
    logsLoading,
}: LogsStateProps & { logsContent: string; logsError: string | null; logsLoading: boolean }) {
    const { t } = useTranslation();

    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold text-foreground">{t('appView.applicationLogs')}</h1>
                <p className="text-sm leading-6 text-muted-foreground">
                    {t('appView.logsDescription', { applicationName })}
                </p>
            </div>

            {!logsLoading &&
                (logsError ? (
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                        {logsError}
                    </div>
                ) : (
                    <ScrollArea className="h-[60vh] overflow-hidden rounded-md border bg-muted/30">
                        <pre className="p-3 text-xs leading-5 whitespace-pre-wrap text-foreground">
                            {logsContent || t('appView.emptyLogs')}
                        </pre>
                    </ScrollArea>
                ))}
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
