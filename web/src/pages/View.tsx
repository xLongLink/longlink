import { createLucideIconComponent } from '@/components/ui/icon';
import { useMetadata } from '@/hooks/use-metadata';
import XML from '@/layout/XmlLayout';
import { ApiError, fetchApiText } from '@/lib/api';
import type { ApiOrganizationApplication } from '@/lib/types';
import { fromXml, RenderXML, resolveUrl, type ExecutionContext } from '@/xml';
import { buttonVariants } from '@ui/button';
import { ScrollArea } from '@ui/scroll-area';
import { Skeleton } from '@ui/skeleton';
import startCase from 'lodash/startCase';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import NotFound from './NotFound';

type ViewProps = {
    applicationId?: string;
    applicationName?: string;
    applicationStatus?: ApiOrganizationApplication['status'];
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
    path: string | null;
    content: string | null;
    error: string | null;
    status: number | null;
    loading: boolean;
};

type LogsState = {
    content: string;
    error: string | null;
    loading: boolean;
};

const emptyPageState: PageState = {
    path: null,
    content: null,
    error: null,
    status: null,
    loading: false,
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

/**
 * Returns a readable label path for SDK-managed page routes.
 */
function pageLabelPath(path: string): string {
    return normalizePath(path).replace(/^pages\//, '');
}

/**
 * Resolves route params inside a URL template.
 */
function resolveTemplate(template: string, params: Record<string, string | undefined>): string {
    return template
        .replace(/:([A-Za-z0-9_]+)/g, (_, key: string) => params[key] ?? `:${key}`)
        .replace(/\{([A-Za-z0-9_]+)\}/g, (_, key: string) => params[key] ?? `{${key}}`);
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
    const [pageState, setPageState] = useState<PageState>(emptyPageState);
    const [logsState, setLogsState] = useState<LogsState>(emptyLogsState);
    const routeParams = { organization, application } as Record<string, string | undefined>;
    const resolvedMetadata = resolveTemplate(metadata, routeParams);
    const resolvedMetadataBaseUrl = resolvedMetadata.replace(/metadata\.json(?:[?#].*)?$/i, '');
    const applicationIsLoading = applicationStatus !== undefined && applicationStatus !== 'running';
    const { data: metadataDocument, isLoading, error } = useMetadata(resolvedMetadata, !applicationIsLoading);
    const normalizedRoutePath = normalizePath(wildcardPath ?? '');
    const selectedTab = searchParams.get('tab');
    /* Resolve the active page from the selected tab path first, then the route path. */
    const activePage =
        metadataDocument?.pages?.find((page) => normalizePath(page.path.replace(/\.xml$/i, '')) === selectedTab) ??
        metadataDocument?.pages?.find(
            (page) => normalizePath(page.path.replace(/\.xml$/i, '')) === normalizedRoutePath
        ) ??
        metadataDocument?.pages?.[0];
    const isNotFound = metadataDocument === null;
    const metadataLoading = error instanceof ApiError && error.status === 503;
    const shouldShowLogs =
        canViewLogs && applicationStatus === 'running' && (metadataLoading || pageState.status === 503);
    const ast = useMemo(() => (pageState.content ? fromXml(pageState.content) : null), [pageState.content]);

    // Make the first tab explicit in the URL when the page loads without a tab selection.
    useEffect(() => {
        if (!metadataDocument?.pages?.length || selectedTab || normalizedRoutePath) {
            return;
        }

        const firstTab = normalizePath(metadataDocument.pages[0].path.replace(/\.xml$/i, ''));
        const nextSearchParams = new URLSearchParams(searchParams);
        nextSearchParams.set('tab', firstTab);

        navigate(`?${nextSearchParams.toString()}`, { replace: true });
    }, [metadataDocument?.pages, navigate, normalizedRoutePath, searchParams, selectedTab]);

    /* Build tab links from metadata page names. */
    const tabs = Object.fromEntries(
        metadataDocument?.pages?.map((page) => {
            const tabValue = normalizePath(page.path.replace(/\.xml$/i, ''));
            const nextSearchParams = new URLSearchParams(searchParams);
            nextSearchParams.set('tab', tabValue);

            const href = application
                ? `/orgs/${organization}/apps/${application}?${nextSearchParams.toString()}`
                : organization
                  ? `/orgs/${organization}?${nextSearchParams.toString()}`
                  : `?${nextSearchParams.toString()}`;

            const label = page.name?.trim() || startCase(pageLabelPath(tabValue));
            const iconName = page.icon?.trim();
            const icon = iconName ? createLucideIconComponent(iconName) : undefined;

            return [label, icon ? { href, icon } : href] as const;
        }) ?? []
    );

    /* Load the active page XML from its path. */
    useEffect(() => {
        if (shouldShowLogs || applicationIsLoading || !activePage) {
            setPageState(emptyPageState);
            return;
        }

        const controller = new AbortController();
        const pagePath = activePage.path.startsWith('/') ? activePage.path : `/${activePage.path}`;
        const pageUrl =
            activePage.path.startsWith('http://') || activePage.path.startsWith('https://')
                ? activePage.path
                : resolveUrl(resolvedMetadataBaseUrl, pagePath);

        setPageState({ ...emptyPageState, path: activePage.path, loading: true });

        void fetchApiText(pageUrl, {
            headers: { Accept: 'application/xml' },
            signal: controller.signal,
        })
            .then((content) => {
                if (!controller.signal.aborted) {
                    setPageState({ ...emptyPageState, path: activePage.path, content });
                }
            })
            .catch((fetchError: unknown) => {
                if (controller.signal.aborted) {
                    return;
                }

                setPageState({
                    ...emptyPageState,
                    path: activePage.path,
                    error: fetchError instanceof Error ? fetchError.message : 'Failed to load page',
                    status: fetchError instanceof ApiError ? fetchError.status : null,
                });
            });

        return () => controller.abort();
    }, [activePage?.path, applicationIsLoading, resolvedMetadataBaseUrl, shouldShowLogs]);

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

    if (pageState.error && pageState.path === activePage?.path && pageState.status === 503) {
        return (
            <XML tabs={tabs}>
                <section className="flex min-h-[calc(100vh-14rem)] items-center justify-center px-6 py-12">
                    <LoadingState status={applicationStatus ?? 'loading'} />
                </section>
            </XML>
        );
    }

    if (pageState.error && pageState.path === activePage?.path) {
        return (
            <XML tabs={tabs}>
                <section className="flex min-h-[calc(100vh-14rem)] items-center justify-center px-6 py-12">
                    <ErrorState
                        actionHref={organization ? `/orgs/${organization}` : '/organizations'}
                        actionLabel={organization ? 'Back to organization' : 'Back to organizations'}
                        message={pageState.error || 'This page could not be loaded.'}
                        title="Unable to load this page"
                    />
                </section>
            </XML>
        );
    }

    if (isLoading || pageState.loading || (activePage && pageState.path !== activePage.path)) {
        // Keep the XML shell mounted while metadata or page content is still loading.
        return (
            <XML tabs={tabs}>
                <section className="space-y-6">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-5 w-[28rem] max-w-full" />
                    <div className="grid gap-4 lg:grid-cols-2">
                        <Skeleton className="h-48 w-full" />
                        <Skeleton className="h-48 w-full" />
                    </div>
                </section>
            </XML>
        );
    }

    if (!activePage) {
        return (
            <XML tabs={tabs}>
                <section className="flex min-h-[calc(100vh-14rem)] items-center justify-center px-6 py-12">
                    <ErrorState
                        actionHref={organization ? `/orgs/${organization}` : '/organizations'}
                        actionLabel={organization ? 'Back to organization' : 'Back to organizations'}
                        message="The application did not expose any pages to render."
                        title="Unexpected application response"
                    />
                </section>
            </XML>
        );
    }

    if (!ast) {
        return (
            <XML tabs={tabs}>
                <section className="flex min-h-[calc(100vh-14rem)] items-center justify-center px-6 py-12">
                    <ErrorState
                        actionHref={organization ? `/orgs/${organization}` : '/organizations'}
                        actionLabel={organization ? 'Back to organization' : 'Back to organizations'}
                        message="The application returned an empty response."
                        title="Unexpected application response"
                    />
                </section>
            </XML>
        );
    }

    return (
        <XML tabs={tabs}>
            <section className="space-y-6">
                <RenderXML key={runtimeKey} ast={ast} ctx={runtimeContext} baseUrl={resolvedMetadataBaseUrl} />
            </section>
        </XML>
    );
}

/** Renders the in-shell loading page for an application that is not ready yet. */
function LoadingState({ status }: LoadingStateProps) {
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

            {logsLoading ? (
                <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">Loading logs...</div>
            ) : logsError ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                    {logsError}
                </div>
            ) : (
                <ScrollArea className="h-[60vh] overflow-hidden rounded-md border bg-muted/30">
                    <pre className="p-3 text-xs leading-5 whitespace-pre-wrap text-foreground">
                        {logsContent || 'No logs available.'}
                    </pre>
                </ScrollArea>
            )}
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
