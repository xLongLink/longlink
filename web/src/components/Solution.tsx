import { api } from '@/lib/api';
import { parseXML } from '@/xml';
import type { ReactNode } from 'react';
import { viewsSchema } from '@/xml/views';
import { startCase } from 'es-toolkit/compat';
import { PageError } from '@/components/Utils';
import { useQuery } from '@tanstack/react-query';
import { Center } from '@astryxdesign/core/Center';
import { Spinner } from '@astryxdesign/core/Spinner';
import { matchRoutes, Navigate, useParams } from 'react-router';
import { RouterXmlRuntime } from '@/components/RouterXmlRuntime';
import type { NavigationTab } from '@/platform/layouts/Platform';
import { resolveNavigationUrl, resolveRequestUrl } from '@/xml/core/url';
import {
    Activity,
    ArrowRight,
    Banknote,
    Bell,
    Box,
    Boxes,
    Building2,
    Check,
    ClipboardList,
    Container,
    Cpu,
    Database,
    Download,
    HardDrive,
    Layers,
    LayoutDashboard,
    LayoutGrid,
    Link as LinkIcon,
    List as ListIcon,
    ListChecks,
    MapPin,
    Plus,
    Rocket,
    RotateCcw,
    Settings2,
    ShieldCheck,
    SlidersHorizontal,
    Timer,
    Users,
    X,
    type LucideIcon,
} from 'lucide-react';

type SolutionRuntimeProps = {
    children: (solution: { content: ReactNode; tabs: readonly NavigationTab[]; title?: string }) => ReactNode;
    navigationBaseUrl?: string;
    viewsUrl?: string;
};

const EMPTY_VIEWS = [] as const;

/** Maps Solution manifest icon names to their Lucide components. */
const iconComponents: Record<string, LucideIcon> = {
    activity: Activity,
    'arrow-right': ArrowRight,
    banknote: Banknote,
    bell: Bell,
    box: Box,
    boxes: Boxes,
    'building-2': Building2,
    check: Check,
    'clipboard-list': ClipboardList,
    container: Container,
    cpu: Cpu,
    database: Database,
    download: Download,
    'hard-drive': HardDrive,
    layers: Layers,
    'layout-dashboard': LayoutDashboard,
    'layout-grid': LayoutGrid,
    link: LinkIcon,
    list: ListIcon,
    'list-check': ListChecks,
    'map-pin': MapPin,
    plus: Plus,
    rocket: Rocket,
    'rotate-ccw': RotateCcw,
    'settings-2': Settings2,
    'shield-check': ShieldCheck,
    'sliders-horizontal': SlidersHorizontal,
    timer: Timer,
    users: Users,
    x: X,
};

/** Formats the SDK's route-derived fallback label when a View has no explicit name. */
function routeLabel(route: string): string {
    // Remove the leading slash and truncate at the first nested dynamic segment.
    return startCase(route.slice(1).split('/:', 1)[0] || 'index');
}

/** Resolves and renders the current manifest-defined View. */
export function SolutionRuntime({ children, navigationBaseUrl = '/', viewsUrl = '/views.json' }: SolutionRuntimeProps) {
    const { '*': routePath = '' } = useParams();

    // Resolve XML requests beside the manifest without changing its URL form.
    const viewsLocation = new URL(viewsUrl, 'http://longlink.local');
    const requestBaseLocation = new URL('.', viewsLocation);
    const requestBaseUrl = viewsUrl.startsWith('/') ? requestBaseLocation.pathname : requestBaseLocation.toString();
    const { data: registeredViews, error: viewsError } = useQuery({
        queryKey: ['api', viewsUrl],
        queryFn: async ({ signal }) => viewsSchema.parse(await api(viewsUrl, { signal }).json()),
    });
    const views = registeredViews ?? EMPTY_VIEWS;
    const match = matchRoutes(
        views.map((view) => ({
            path: view.route,
            view,
        })),
        `/${routePath}`
    )?.[0];

    const tabViews = views.filter((view) => view.route !== '/' && !view.route.includes('/:'));
    const firstTabView = tabViews[0];

    // Let dynamic detail views share a tab with their matching list view.
    const activeView = !routePath ? firstTabView : match?.route.view;
    const activeViewTitle = activeView ? (activeView.name ?? routeLabel(activeView.route)) : undefined;
    const isNotFound = registeredViews !== undefined && routePath.length > 0 && match == null;
    const { data: activeViewAst, error: activeViewError } = useQuery({
        enabled: routePath.length > 0 && activeView !== undefined,
        queryKey: ['api', 'solution-view', viewsUrl, activeView?.path],
        queryFn: async ({ signal }) => {
            if (!activeView) throw new Error('No active View');

            const viewUrl = resolveRequestUrl(requestBaseUrl, activeView.path);
            const content = await api(viewUrl, { headers: { Accept: 'application/xml' }, signal }).text();

            return parseXML(content);
        },
        retry: false,
    });
    // Build one static navigation target per solution tab.
    const tabs = tabViews.map(
        (view) =>
            ({
                href: resolveNavigationUrl(navigationBaseUrl, view.route),
                icon: view.icon ? iconComponents[view.icon] : undefined,
                label: view.name ?? routeLabel(view.route),
            }) satisfies NavigationTab
    );

    let content: ReactNode;

    // The browser never requests the solution server root, so mirror its redirect client-side.
    if (!routePath && firstTabView) {
        return <Navigate replace to={tabs[0].href} />;
    }

    // The solution base redirects above; render errors and views below.
    if (isNotFound) {
        content = (
            <PageError description="This page doesn't exist or isn't available." title="We can't find that page" />
        );
    } else if (viewsError) {
        content = (
            <PageError
                description="The solution definition could not be loaded."
                title="Unable to load this solution"
            />
        );
    } else if (activeViewAst && activeView && match) {
        content = (
            <RouterXmlRuntime
                ast={activeViewAst}
                key={JSON.stringify([viewsUrl, navigationBaseUrl, activeView.route, activeView.path, routePath])}
                navigationBaseUrl={navigationBaseUrl}
                params={Object.fromEntries(
                    Object.entries(match.params).filter((entry): entry is [string, string] => entry[1] != null)
                )}
                requestBaseUrl={requestBaseUrl}
            />
        );
    } else if (registeredViews && !activeView) {
        content = (
            <PageError
                description="The solution did not expose any views to render."
                title="Unexpected solution response"
            />
        );
    } else if (activeViewError) {
        content = <PageError description="The view could not be loaded." title="Unable to load this view" />;
    } else {
        content = (
            <Center minHeight="calc(100vh - 14rem)" width="100%">
                <Spinner label="Loading" />
            </Center>
        );
    }

    return children({
        content,
        tabs,
        title: isNotFound ? 'Page Not Found' : activeViewTitle,
    });
}
