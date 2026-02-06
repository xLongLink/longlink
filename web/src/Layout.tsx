import type { LucideIcon } from 'lucide-react';
import {
    BarChart3,
    Boxes,
    FileText,
    GitBranch,
    Layers,
    LayoutGrid,
    Settings,
    Sparkles,
    User,
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
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserProfile } from '@/components/user-profile';

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

const organizationTabs: NavigationTab[] = [
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

const defaultAppTabs: NavigationTab[] = [
    { value: 'overview', label: 'Overview', path: '', icon: LayoutGrid },
    { value: 'data', label: 'Data', path: 'data', icon: FileText },
    { value: 'settings', label: 'Settings', path: 'settings', icon: Settings },
];

const accountTabs: NavigationTab[] = [
    {
        value: 'organizations',
        label: 'Organizations',
        path: 'organizations',
        icon: Users,
    },
    { value: 'profile', label: 'Profile', path: 'profile', icon: User },
    { value: 'developer', label: 'Developer', path: 'developer', icon: Wrench },
];

const appTabsByName: Record<string, NavigationTab[]> = {
    viavai: [
        { value: 'overview', label: 'Overview', path: '', icon: LayoutGrid },
        {
            value: 'automations',
            label: 'Automations',
            path: 'automations',
            icon: Sparkles,
        },
        {
            value: 'integrations',
            label: 'Integrations',
            path: 'integrations',
            icon: Boxes,
        },
        {
            value: 'settings',
            label: 'Settings',
            path: 'settings',
            icon: Settings,
        },
    ],
    atlas: [
        { value: 'overview', label: 'Overview', path: '', icon: LayoutGrid },
        { value: 'models', label: 'Models', path: 'models', icon: Layers },
        { value: 'reports', label: 'Reports', path: 'reports', icon: FileText },
        {
            value: 'settings',
            label: 'Settings',
            path: 'settings',
            icon: Settings,
        },
    ],
    pulse: [
        { value: 'overview', label: 'Overview', path: '', icon: LayoutGrid },
        {
            value: 'streams',
            label: 'Streams',
            path: 'streams',
            icon: Sparkles,
        },
        { value: 'alerts', label: 'Alerts', path: 'alerts', icon: Wrench },
        {
            value: 'settings',
            label: 'Settings',
            path: 'settings',
            icon: Settings,
        },
    ],
};

export default function Layout() {
    const { app, org } = useParams();
    const appTabs = app ? (appTabsByName[app] ?? defaultAppTabs) : null;
    const tabs = org ? (appTabs ?? organizationTabs) : accountTabs;

    return (
        <Navigation
            tabs={tabs}
            basePathSuffix={app ? `apps/${app}` : undefined}
        />
    );
}

export function Navigation({ tabs, basePathSuffix }: NavigationProps) {
    const { country = '', org = '', app } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const organizationName = formatOrganizationName(org || 'org');
    const appName = app ? formatAppName(app) : undefined;
    const normalizedSuffix = basePathSuffix?.replace(/^\/+|\/+$/g, '') ?? '';
    const basePath = org
        ? normalizedSuffix
            ? `/${country}/${org}/${normalizedSuffix}`
            : `/${country}/${org}`
        : '';

    const activeTab = (() => {
        const path = location.pathname;
        const matchedTab = tabs.find((tab) => {
            const tabPath = tab.path ?? '';
            if (tabPath === '') {
                return path === (basePath || '/');
            }
            const tabFullPath = basePath
                ? `${basePath}/${tabPath}`
                : `/${tabPath}`;
            return path.startsWith(tabFullPath);
        });

        return matchedTab?.value ?? tabs[0]?.value ?? 'overview';
    })();

    return (
        <div className="min-h-screen text-white">
            <header className="border-b border-white/10">
                <div className="mx-auto w-full px-6 pb-2 pt-4">
                    <div className="flex items-center justify-between gap-4 text-white/80">
                        <div className="flex items-center gap-4">
                            <Link
                                to="/"
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-blue-300 transition hover:bg-white/10"
                            >
                                <BarChart3 className="h-5 w-5" />
                            </Link>
                            <Breadcrumb>
                                <BreadcrumbList>
                                    <BreadcrumbItem>
                                        <BreadcrumbLink
                                            render={(props) => (
                                                <Link
                                                    {...props}
                                                    to={
                                                        org
                                                            ? `/${country}/${org}`
                                                            : '/'
                                                    }
                                                    className="text-sm font-semibold text-white/70"
                                                >
                                                    {organizationName}
                                                </Link>
                                            )}
                                        />
                                    </BreadcrumbItem>
                                    {appName ? (
                                        <>
                                            <BreadcrumbSeparator />
                                            <BreadcrumbItem>
                                                <BreadcrumbLink
                                                    render={(props) => (
                                                        <Link
                                                            {...props}
                                                            to={`/${country}/${org}/apps/${app}`}
                                                            className="text-sm font-semibold text-white/70"
                                                        >
                                                            {appName}
                                                        </Link>
                                                    )}
                                                />
                                            </BreadcrumbItem>
                                        </>
                                    ) : null}
                                </BreadcrumbList>
                            </Breadcrumb>
                        </div>
                        <UserProfile />
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
                            const targetPath =
                                nextPath === ''
                                    ? basePath || '/'
                                    : basePath
                                      ? `${basePath}/${nextPath}`
                                      : `/${nextPath}`;
                            navigate(targetPath);
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

function formatAppName(value: string) {
    const appNames: Record<string, string> = {
        viavai: 'ViaVai',
        atlas: 'Atlas',
        pulse: 'Pulse',
    };
    return appNames[value] ?? formatOrganizationName(value);
}
