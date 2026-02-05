import { useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
    BarChart3,
    GitBranch,
    Layers,
    LayoutGrid,
    Plug,
    Users,
    Wrench,
} from 'lucide-react';
import {
    Link,
    Outlet,
    useLocation,
    useNavigate,
    useParams,
} from 'react-router';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type NavigationTab = {
    value: string;
    label: string;
    path?: string;
    icon: LucideIcon;
};

type NavigationProps = {
    tabs: NavigationTab[];
    basePathSuffix?: string;
};

const staticTabs: NavigationTab[] = [
    { value: 'overview', label: 'Overview', path: '', icon: LayoutGrid },
    { value: 'tools', label: 'Tools', path: 'tools', icon: Wrench },
    { value: 'solutions', label: 'Solutions', path: 'solutions', icon: Layers },
    {
        value: 'workflows',
        label: 'Workflows',
        path: 'workflows',
        icon: GitBranch,
    },
    { value: 'people', label: 'People', path: 'people', icon: Users },
];

export default function Layout() {
    const { app } = useParams();
    const appTabs = useMemo<NavigationTab[]>(() => {
        const apps = [
            { slug: 'viavai', name: 'ViaVai' },
            { slug: 'atlas', name: 'Atlas' },
            { slug: 'pulse', name: 'Pulse' },
        ];
        return apps.map((app) => ({
            value: `apps-${app.slug}`,
            label: app.name,
            path: `apps/${app.slug}`,
            icon: Plug,
        }));
    }, []);

    const tabs = useMemo(
        () => (app ? appTabs : [...staticTabs, ...appTabs]),
        [app, appTabs]
    );

    return <Navigation tabs={tabs} />;
}

export function Navigation({ tabs, basePathSuffix }: NavigationProps) {
    const { org = '' } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const organizationName = formatOrganizationName(org || 'org');
    const normalizedSuffix = basePathSuffix?.replace(/^\/+|\/+$/g, '') ?? '';
    const basePath = normalizedSuffix
        ? `/${org}/${normalizedSuffix}`
        : `/${org}`;

    const activeTab = (() => {
        const path = location.pathname;
        const matchedTab = tabs.find((tab) => {
            const tabPath = tab.path ?? '';
            if (tabPath === '') {
                return path === basePath;
            }
            return path.startsWith(`${basePath}/${tabPath}`);
        });

        return matchedTab?.value ?? tabs[0]?.value ?? 'overview';
    })();

    return (
        <div className="min-h-screen text-white">
            <header className="border-b border-white/10">
                <div className="mx-auto w-full px-6 pb-2 pt-4">
                    <div className="flex items-center gap-4 text-white/80">
                        <Link
                            to="/"
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-blue-300 transition hover:bg-white/10"
                        >
                            <BarChart3 className="h-5 w-5" />
                        </Link>
                        <span className="text-sm font-semibold text-white/70">
                            {organizationName}
                        </span>
                    </div>
                </div>

                {/* Tabs navigation */}
                <div className="mx-auto w-full px-6 pb-2">
                    <Tabs
                        value={activeTab}
                        onValueChange={(value) => {
                            const nextTab = tabs.find(
                                (tab) => tab.value === value
                            );
                            if (!nextTab) {
                                return;
                            }
                            const nextPath = nextTab.path ?? '';
                            navigate(
                                nextPath === ''
                                    ? basePath
                                    : `${basePath}/${nextPath}`
                            );
                        }}
                    >
                        <TabsList variant="line" className="gap-4">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <TabsTrigger
                                        key={tab.value}
                                        value={tab.value}
                                        className="cursor-pointer"
                                    >
                                        <Icon className="h-4 w-4" />
                                        {tab.label}
                                    </TabsTrigger>
                                );
                            })}
                        </TabsList>
                    </Tabs>
                </div>
            </header>

            <main className="mx-auto w-full max-w-6xl gap-8 px-6 pb-16 pt-10">
                <section className="space-y-6">
                    <Outlet />
                </section>
            </main>
        </div>
    );
}

function formatOrganizationName(value: string) {
    return value
        .split('-')
        .map((segment) =>
            segment.length > 0
                ? segment[0].toUpperCase() + segment.slice(1)
                : segment
        )
        .join(' ');
}
