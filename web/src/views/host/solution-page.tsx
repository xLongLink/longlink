import * as host from '@/views/host';
import type { ReactNode } from 'react';
import { FileText } from 'lucide-react';
import { startCase } from 'es-toolkit/compat';
import { resolveNavigationUrl } from '@/lib/url';
import { useQuery } from '@tanstack/react-query';
import { PageError } from '@/components/ui/utils';
import { manifestSchema } from '@/views/manifest';
import Platform from '@/components/layouts/platform';
import type { IconName } from 'lucide-react/dynamic';
import { Spinner } from '@/components/shadcn/spinner';
import type { DevelopmentUser } from '@/views/manifest';
import { Icon } from '@/components/longlink/display/icon';
import { SolutionView } from '@/views/host/solution-view';
import { Button } from '@/components/longlink/action/button';
import { matchRoutes, Navigate, useParams } from 'react-router';
import { PageContainer } from '@/components/layouts/page-container';

const EMPTY_VIEWS = [] as const;

/** Formats a View filename, including dynamic parameter files, as its display title. */
function viewLabel(path: string): string {
    // SDK paths omit the extension; custom manifests may retain it.
    const filename = path.substring(path.lastIndexOf('/') + 1).replace(/\.jsx$/, '');

    return startCase(filename.replace(/^\[(.*)\]$/, '$1'));
}

/** Resolves the current manifest-defined View and renders its page frame. */
export function SolutionPage({
    action,
    breadcrumb,
    developmentAction,
    formatTitle,
    navigationBaseUrl = '/',
    sidebarHeader,
    viewsUrl = '/views.json'
}: {
    action: ReactNode;
    breadcrumb: ReactNode;
    developmentAction?: (users: readonly DevelopmentUser[]) => ReactNode;
    formatTitle: (title: string | undefined) => string;
    navigationBaseUrl?: string;
    sidebarHeader?: ReactNode;
    viewsUrl?: string;
}) {
    const { '*': routePath = '' } = useParams();

    const {
        data: manifest,
        error: viewsError,
        refetch: refetchManifest
    } = useQuery({
        queryKey: ['api', viewsUrl],
        queryFn: async ({ signal }) => {
            const body = await host.load(viewsUrl, { signal });
            const data: unknown = JSON.parse(await body.text());

            return manifestSchema.parse(data);
        }
    });

    const views = manifest?.views ?? EMPTY_VIEWS;

    const match = matchRoutes(
        views.map((view) => ({ path: view.route, view })),
        `/${routePath}`
    )?.[0];

    // Let nested and dynamic detail Views share their parent tab.
    const navigationTabs =
        manifest?.tabs?.map((tab) => ({
            route: tab.route,
            label: tab.label ?? viewLabel(views.find((view) => view.route === tab.route)?.path ?? tab.route),
            icon: tab.icon
        })) ??
        views
            .filter((view) => view.route !== '/' && !view.route.includes('/', 1) && !view.route.includes('/:'))
            .map((view) => ({ route: view.route, label: viewLabel(view.path), icon: undefined }));
    const activeView = match?.route.view;

    const activeViewTitle = activeView
        ? (navigationTabs.find((tab) => tab.route === activeView.route)?.label ?? viewLabel(activeView.path))
        : undefined;

    const isNotFound = manifest !== undefined && routePath.length > 0 && match == null;

    // Build one static navigation target per solution tab.
    const tabs = navigationTabs.map((view) => ({
        href: resolveNavigationUrl(navigationBaseUrl, view.route),
        label: view.label,
        // SAFETY: The icon loader checks manifest names against Lucide's catalog and falls back for unknown names.
        icon: view.icon ? <Icon icon={view.icon as IconName} size="sm" /> : <FileText aria-hidden="true" size={16} />
    }));

    // Keep wordmark navigation on the solution's first page.
    const homeHref = tabs[0]?.href ?? navigationBaseUrl;

    let content: ReactNode;

    // The browser never requests the solution server root, so mirror its redirect client-side.
    if (!routePath && tabs.length > 0) {
        return <Navigate replace to={tabs[0].href} />;
    }

    // The solution base redirects above; render errors and views below.
    if (isNotFound) {
        content = (
            <PageError description="This page doesn't exist or isn't available." title="We can't find that page" />
        );
    } else if (viewsError) {
        content = (
            <PageError description="The solution definition could not be loaded." title="Unable to load this solution">
                <Button type="button" variant="outline" onClick={() => void refetchManifest()}>
                    Retry
                </Button>
            </PageError>
        );
    } else if (activeView && match && manifest) {
        content = (
            <SolutionView
                path={activeView.path}
                viewsUrl={viewsUrl}
                key={JSON.stringify([
                    viewsUrl,
                    navigationBaseUrl,
                    activeView.route,
                    activeView.path,
                    manifest.runtime,
                    routePath
                ])}
                navigationBaseUrl={navigationBaseUrl}
                params={Object.fromEntries(
                    Object.entries(match.params).filter((entry): entry is [string, string] => entry[1] != null)
                )}
                runtime={manifest.runtime}
            />
        );
    } else if (manifest && !activeView) {
        content = (
            <PageError
                description="The solution did not expose any views to render."
                title="Unexpected solution response"
            />
        );
    } else {
        content = (
            <div className="flex min-h-(--page-content-height) w-full min-w-0 items-center justify-center">
                <Spinner className="motion-reduce:animate-none" />
            </div>
        );
    }

    return (
        <Platform
            action={
                manifest?.development_users?.length && developmentAction
                    ? developmentAction(manifest.development_users)
                    : action
            }
            breadcrumb={breadcrumb}
            homeHref={homeHref}
            sidebarHeader={sidebarHeader}
            tabs={tabs}
        >
            <title>{formatTitle(isNotFound ? 'Page Not Found' : activeViewTitle)}</title>
            <PageContainer fill wide={activeView?.width === 'wide'}>
                {content}
            </PageContainer>
        </Platform>
    );
}
