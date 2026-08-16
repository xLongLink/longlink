import { z } from 'zod';
import startCase from 'lodash/startCase';
import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';
import { Center } from '@astryxdesign/core/Center';
import { Spinner } from '@astryxdesign/core/Spinner';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { generatePath, matchRoutes, useNavigate, useParams, type RouteObject } from 'react-router';
import type { PlatformTab } from '@/components/layouts/Platform';
import type { Status } from '@/lib/generated/platform-api-v1/types.gen';
import XmlLayout from '@/xml/layout';
import { requestApi } from '@/lib/api';
import NotFound from '@/platform/NotFound';
import { useApiQuery } from '@/lib/hooks/use-api';
import { getIconComponent } from '@/lib/icons';
import {
    createContext as createXmlContext,
    parseXML,
    RenderXML,
    resolveRequestUrl,
    type ASTNode,
    type XmlRuntime,
} from '@/xml';

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
    pages: string | null;
};

type ErrorStateProps = { message: string; title: string };

type PageState = {
    ast: [ASTNode] | null;
    error: string | null;
    runtimeContext: XmlRuntime;
};

type ActivePageState = PageState & { key: string };

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
    const [activePageState, setActivePageState] = useState<ActivePageState | null>(null);
    const resolvedPagesBaseUrl = pages?.replace(/pages\.json(?:[?#].*)?$/i, '') ?? '';
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
    const visiblePageState = activePageState?.key === activePageStateKey ? activePageState : null;

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
        const tabGroups = new Map<string, PlatformTab>();

        // Build one visible navigation target per tab.
        for (const page of registeredPages ?? []) {
            const dynamic = pageRouteIsDynamic(page.route);

            // Dynamic pages need concrete params, so they cannot be direct navigation targets.
            if (!page.route || dynamic || tabGroups.has(page.tab)) {
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

        return { activeTab: activePage?.tab ? tabGroups.get(activePage.tab)?.href : '', tabs: [...tabGroups.values()] };
    }, [activePage?.tab, application, organization, registeredPages]);

    /* Load the active page and discard inactive page state. */
    useEffect(() => {
        // Skip page loading until an active page can render.
        if (!applicationCanLoad || !activePage) {
            setActivePageState(null);
            return;
        }

        const runtimeContext = createXmlContext();

        runtimeContext.services.navigationBaseUrl = resolveApplicationHref('', organization, application);
        runtimeContext.scope.bindings.params = activeRouteParams;

        const loadingPageState: PageState = { ast: null, error: null, runtimeContext };
        let pageUrl: string;

        // Validate registered page paths before fetch so an app cannot request external URLs.
        try {
            pageUrl = resolveRequestUrl(resolvedPagesBaseUrl, activePage.path);
        } catch (urlError: unknown) {
            setActivePageState({
                ...loadingPageState,
                error: urlError instanceof Error ? urlError.message : 'Invalid page URL',
                key: activePageStateKey,
            });
            return;
        }

        const controller = new AbortController();

        setActivePageState({ ...loadingPageState, key: activePageStateKey });

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
                        ...loadingPageState,
                        ast,
                        error: null,
                        key: activePageStateKey,
                    });
                }
            })
            .catch((fetchError: unknown) => {
                // Ignore aborts from route changes or cleanup.
                if (controller.signal.aborted) {
                    return;
                }

                setActivePageState({
                    ...loadingPageState,
                    error: fetchError instanceof Error ? fetchError.message : 'Failed to load page',
                    key: activePageStateKey,
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
                title="Application is being deleted"
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
                    title="Unexpected application response"
                />
            );
        } else if (visiblePageState?.error) {
            activeFallback = <ErrorState message={visiblePageState.error} title="Unable to load this page" />;
        } else if (!visiblePageState?.ast) {
            activeFallback = <Spinner label="Loading" />;
        }

        content = (
            <>
                {visiblePageState?.ast ? (
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

    return (
        <XmlLayout activeTab={activeTab} tabs={tabs}>
            {content}
        </XmlLayout>
    );
}

/** Renders a centered in-shell application state message. */
function ErrorState({ message, title }: ErrorStateProps) {
    const { organization } = useParams();
    const actionHref = organization ? `/orgs/${organization}` : '/organizations';
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
