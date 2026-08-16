import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';
import { Center } from '@astryxdesign/core/Center';
import { Spinner } from '@astryxdesign/core/Spinner';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { matchRoutes, useNavigate, useParams, type RouteObject } from 'react-router';
import type { Status } from '@/lib/generated/platform-api-v1/types.gen';
import { requestApi } from '@/lib/api';
import NotFound from '@/platform/NotFound';
import { useApiQuery } from '@/lib/hooks/use-api';
import { resolveRequestUrl } from '@/xml/core/url';
import { ApplicationLayout, applicationHref } from '@/platform/layouts/Application';
import { pageRouteIsDynamic, pageSchema, type RuntimePage } from '@/application/runtime/pages';
import { createContext as createXmlContext, parseXML, RenderXML, type ASTNode, type XmlRuntime } from '@/xml';

type ViewProps = {
    applicationStatus?: Status;
    isApplicationLoading?: boolean;
    pages: string | null;
};

type ErrorStateProps = { message: string; organization?: string; title: string };

type PageState = { status: 'loading' } | { ast: [ASTNode]; status: 'ready' } | { message: string; status: 'error' };

type ActivePageState = PageState & { key: string; runtimeContext: XmlRuntime };

const emptyRouteParams: Record<string, string> = {};

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

/**
 * Renders registered XML pages for Platform and Application routes.
 */
export default function View({ applicationStatus, isApplicationLoading, pages }: ViewProps) {
    const { organization, application, '*': wildcardPath } = useParams();
    const navigate = useNavigate();
    const [activePageState, setActivePageState] = useState<ActivePageState | null>(null);
    const resolvedPagesBaseUrl = pages?.replace(/pages\.json(?:[?#].*)?$/i, '') ?? '';
    const applicationCanLoad =
        !isApplicationLoading && (applicationStatus === undefined || applicationStatus === 'running');
    const { data: registeredPages, error } = useApiQuery<RuntimePage[]>(pages, {
        enabled: applicationCanLoad,
        parse: (value) => pageSchema.array().parse(value),
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
            navigate(applicationHref(firstTabPage.route, organization, application), { replace: true });
        }
    }, [application, firstTabPage, navigate, organization, routePath]);

    /* Load the active page and discard inactive page state. */
    useEffect(() => {
        // Skip page loading until an active page can render.
        if (!applicationCanLoad || !activePage) {
            setActivePageState(null);
            return;
        }

        const runtimeContext = createXmlContext(activeRouteParams);

        runtimeContext.services.navigationBaseUrl = applicationHref('', organization, application);

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

        void requestApi(pageUrl, {
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
    }, [
        activePage,
        activePageStateKey,
        activeRouteParams,
        applicationCanLoad,
        application,
        organization,
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
    } else if (applicationStatus === 'deleting') {
        // Keep deleting applications out of the runtime while surfacing their lifecycle state.
        applicationState = (
            <ErrorState
                message="This application is unavailable while LongLink removes it."
                organization={organization}
                title="Application is being deleted"
            />
        );
    } else if (error) {
        // Surface page manifest loading failures in the shell.
        applicationState = (
            <ErrorState
                message={error.message || 'The application definition could not be loaded.'}
                organization={organization}
                title="Unable to load this application"
            />
        );
    }

    let content: ReactNode;

    if (applicationState) {
        content = (
            <Center minHeight="calc(100vh - 14rem)" width="100%">
                {applicationState}
            </Center>
        );
    } else {
        // Delegate unknown app routes to the shared 404 page.
        if (registeredPages && routePath && !activeRouteMatch) {
            return <NotFound />;
        }

        let activeFallback: ReactNode = null;

        // Choose the visible fallback for the active page.
        if (!activePage) {
            activeFallback = (
                <ErrorState
                    message="The application did not expose any pages to render."
                    organization={organization}
                    title="Unexpected application response"
                />
            );
        } else if (visiblePageState?.status === 'error') {
            activeFallback = (
                <ErrorState
                    message={visiblePageState.message}
                    organization={organization}
                    title="Unable to load this page"
                />
            );
        } else if (visiblePageState?.status !== 'ready') {
            activeFallback = <Spinner label="Loading" />;
        }

        content = (
            <>
                {visiblePageState?.status === 'ready' ? (
                    <RenderXML
                        ast={visiblePageState.ast}
                        baseUrl={resolvedPagesBaseUrl}
                        ctx={visiblePageState.runtimeContext}
                    />
                ) : null}
                {activeFallback && (
                    <Center minHeight="calc(100vh - 14rem)" width="100%">
                        {activeFallback}
                    </Center>
                )}
            </>
        );
    }

    return <ApplicationLayout pages={registeredPages ?? []}>{content}</ApplicationLayout>;
}

/** Renders a centered in-shell application state message. */
function ErrorState({ message, organization, title }: ErrorStateProps) {
    const actionHref = applicationHref('', organization);
    const actionLabel = organization ? 'Back to organization' : 'Back to organizations';

    return (
        <Card maxWidth={576} padding={6} width="100%">
            <EmptyState
                actions={<Button href={actionHref} label={actionLabel} variant="primary" />}
                description={message}
                headingLevel={1}
                role="alert"
                title={title}
            />
        </Card>
    );
}
