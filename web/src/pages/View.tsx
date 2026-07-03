import { createLucideIconComponent } from '@/components/ui/icon';
import { useMetadata } from '@/hooks/use-metadata';
import XML from '@/layout/XmlLayout';
import { ApiError, fetchApiText } from '@/lib/api';
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

/**
 * Removes leading and trailing slashes from a route path.
 */
function normalizePath(path: string): string {
    return path.replace(/^\/+|\/+$/g, '');
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
function createPageState(key: string, path: string, runtimeContext?: ExecutionContext): PageState {
    return {
        cacheKey: key,
        path,
        ast: null,
        error: null,
        loading: false,
        parseError: null,
        status: null,
        runtimeContext: createPageRuntimeContext(runtimeContext),
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
    metadata,
    runtimeContext,
    runtimeKey,
}: ViewProps) {
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
    const pageCacheKey = `${resolvedMetadata}\u0000${runtimeKey ?? ''}`;
    const applicationIsLoading = applicationStatus !== undefined && applicationStatus !== 'running';
    const { data: metadataDocument, isLoading, error } = useMetadata(resolvedMetadata, !applicationIsLoading);
    const normalizedRoutePath = normalizePath(wildcardPath ?? '');
    const selectedTab = searchParams.get('tab');
    /* Resolve the active page from the selected tab path first, then the route path. */
    const activePage =
        metadataDocument?.pages?.find((page) => page.tab === selectedTab) ??
        metadataDocument?.pages?.find(
            (page) => normalizePath(page.path.replace(/\.xml$/i, '')) === normalizedRoutePath
        ) ??
        metadataDocument?.pages?.[0];
    const activePagePath = activePage?.path;
    const activePageTab = activePage?.tab;
    const activePageState = activePageTab ? pageStates[activePageTab] : undefined;
    const activePageStateIsCurrent =
        activePageState?.cacheKey === pageCacheKey && activePageState.path === activePagePath;
    const isNotFound = metadataDocument === null;
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

    // Make the first tab explicit in the URL when the page loads without a tab selection.
    useEffect(() => {
        if (!metadataDocument?.pages?.length || selectedTab || normalizedRoutePath) {
            return;
        }

        const query = new URLSearchParams({ tab: metadataDocument.pages[0].tab });

        navigate(`?${query.toString()}`, { replace: true });
    }, [metadataDocument?.pages, navigate, normalizedRoutePath, selectedTab]);

    const tabs = useMemo(
        () =>
            Object.fromEntries(
                metadataDocument?.pages?.map((page) => {
                    const query = new URLSearchParams({ tab: page.tab });
                    const href = application
                        ? `/orgs/${organization}/apps/${application}?${query.toString()}`
                        : organization
                          ? `/orgs/${organization}?${query.toString()}`
                          : `?${query.toString()}`;

                    const label = page.name?.trim() || startCase(page.tab);
                    const iconName = page.icon?.trim();
                    const icon = iconName ? createLucideIconComponent(iconName) : undefined;

                    return [label, icon ? { href, icon } : href] as const;
                }) ?? []
            ),
        [application, metadataDocument?.pages, organization]
    );

    /* Load each XML page once when the user first visits its tab. */
    useEffect(() => {
        if (shouldShowLogs || applicationIsLoading || !activePageTab || activePagePath === undefined) {
            return;
        }

        const pageKey = `${pageCacheKey}\u0000${activePageTab}\u0000${activePagePath}`;
        const existingPageState = pageStatesRef.current[activePageTab];

        if (
            existingPageState?.cacheKey === pageCacheKey &&
            existingPageState.path === activePagePath &&
            (existingPageState.ast !== null ||
                existingPageState.error !== null ||
                existingPageState.parseError !== null)
        ) {
            return;
        }

        if (
            existingPageState?.cacheKey === pageCacheKey &&
            existingPageState.path === activePagePath &&
            inFlightPageKeysRef.current.has(pageKey)
        ) {
            return;
        }

        const loadingPageState = {
            ...createPageState(pageCacheKey, activePagePath, runtimeContextRef.current),
            loading: true,
        };
        let pageUrl: string;

        // Validate metadata page paths before fetch so app metadata cannot request external URLs.
        try {
            pageUrl = resolveRequestUrl(resolvedMetadataBaseUrl, activePagePath);
        } catch (urlError: unknown) {
            const errorPageState = {
                ...loadingPageState,
                error: urlError instanceof Error ? urlError.message : 'Invalid page URL',
                loading: false,
            };

            setPageStates((current) => {
                const next = { ...current, [activePageTab]: errorPageState };

                pageStatesRef.current = next;

                return next;
            });

            return;
        }

        const controller = new AbortController();

        inFlightPageKeysRef.current.add(pageKey);
        setPageStates((current) => {
            const next = { ...current, [activePageTab]: loadingPageState };

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
                        const currentPageState = current[activePageTab];

                        if (currentPageState?.cacheKey !== pageCacheKey || currentPageState.path !== activePagePath) {
                            return current;
                        }

                        const next = {
                            ...current,
                            [activePageTab]: {
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
                    const currentPageState = current[activePageTab];

                    if (currentPageState?.cacheKey !== pageCacheKey || currentPageState.path !== activePagePath) {
                        return current;
                    }

                    const next = {
                        ...current,
                        [activePageTab]: {
                            ...currentPageState,
                            error: fetchError instanceof Error ? fetchError.message : 'Failed to load page',
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
    }, [activePagePath, activePageTab, applicationIsLoading, pageCacheKey, resolvedMetadataBaseUrl, shouldShowLogs]);

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
                    error: fetchError instanceof Error ? fetchError.message : 'Failed to load logs',
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
                        actionLabel={organization ? 'Back to organization' : 'Back to organizations'}
                        message={error.message || 'The application definition could not be loaded.'}
                        title="Unable to load this application"
                    />
                </section>
            </XML>
        );
    }

    if (isNotFound) {
        return <NotFound />;
    }

    const renderedPagePanels =
        metadataDocument?.pages?.map((page) => {
            const pageState = pageStates[page.tab];

            if (
                !pageState?.ast ||
                pageState.cacheKey !== pageCacheKey ||
                pageState.path !== page.path ||
                pageState.error ||
                pageState.parseError
            ) {
                return null;
            }

            const pageIsActive = page.tab === activePageTab;

            return (
                <section key={page.tab} hidden={!pageIsActive} aria-hidden={!pageIsActive} className="space-y-6">
                    <RenderXML
                        key={`${runtimeKey ?? 'runtime'}-${page.tab}`}
                        active={pageIsActive}
                        ast={pageState.ast}
                        baseUrl={resolvedMetadataBaseUrl}
                        ctx={pageState.runtimeContext}
                    />
                </section>
            );
        }) ?? [];

    let activeFallback: ReactNode = null;

    if (!activePage) {
        activeFallback = (
            <ErrorState
                actionHref={organization ? `/orgs/${organization}` : '/organizations'}
                actionLabel={organization ? 'Back to organization' : 'Back to organizations'}
                message="The application did not expose any pages to render."
                title="Unexpected application response"
            />
        );
    } else if (activePageStateIsCurrent && activePageState.error && activePageState.status === 503) {
        activeFallback = <LoadingState status={applicationStatus ?? 'loading'} />;
    } else if (activePageStateIsCurrent && activePageState.error) {
        activeFallback = (
            <ErrorState
                actionHref={organization ? `/orgs/${organization}` : '/organizations'}
                actionLabel={organization ? 'Back to organization' : 'Back to organizations'}
                message={activePageState.error || 'This page could not be loaded.'}
                title="Unable to load this page"
            />
        );
    } else if (activePageStateIsCurrent && activePageState.parseError) {
        activeFallback = (
            <ErrorState
                actionHref={organization ? `/orgs/${organization}` : '/organizations'}
                actionLabel={organization ? 'Back to organization' : 'Back to organizations'}
                message={activePageState.parseError}
                title="Unable to load this page"
            />
        );
    } else if (isLoading || !activePageStateIsCurrent || activePageState.loading) {
        activeFallback = <LoadingState status="loading" />;
    } else if (!activePageState.ast) {
        activeFallback = (
            <ErrorState
                actionHref={organization ? `/orgs/${organization}` : '/organizations'}
                actionLabel={organization ? 'Back to organization' : 'Back to organizations'}
                message="The application returned an empty response."
                title="Unexpected application response"
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
    if (status === 'loading') return null;

    return (
        <div className="w-full max-w-xl rounded-2xl border border-border bg-card/80 px-6 py-8 text-center shadow-sm">
            <div className="space-y-3">
                <h1 className="text-2xl font-semibold text-foreground">Application is {status}</h1>
                <p className="text-sm leading-6 text-muted-foreground">Please try again in a moment.</p>
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
    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold text-foreground">Application logs</h1>
                <p className="text-sm leading-6 text-muted-foreground">Recent logs for {applicationName}.</p>
            </div>

            {!logsLoading &&
                (logsError ? (
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                        {logsError}
                    </div>
                ) : (
                    <ScrollArea className="h-[60vh] overflow-hidden rounded-md border bg-muted/30">
                        <pre className="p-3 text-xs leading-5 whitespace-pre-wrap text-foreground">
                            {logsContent || 'No logs available.'}
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
