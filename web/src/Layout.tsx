import type { LucideIcon } from 'lucide-react';
import {
    BarChart3,
    Building2,
    GitBranch,
    Layers,
    LayoutGrid,
    LogOut,
    Smile,
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
    return <Navigation tabs={staticTabs} />;
}

export function Navigation({ tabs, basePathSuffix }: NavigationProps) {
    const { org = '', app } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const organizationName = formatOrganizationName(org || 'org');
    const appName = app ? formatAppName(app) : undefined;
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
                                                    to={org ? `/${org}` : '/'}
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
                                                            to={`/${org}/apps/${app}`}
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
                        <DropdownMenu>
                            <DropdownMenuTrigger className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1 transition hover:border-white/20 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30">
                                <Avatar className="size-7">
                                    <AvatarImage
                                        src="https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=facearea&w=80&h=80&q=80"
                                        alt="User profile"
                                    />
                                    <AvatarFallback>SS</AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium text-white/80">
                                    Sau1707
                                </span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64">
                                <DropdownMenuLabel className="space-y-1">
                                    <p className="text-sm font-semibold text-white">
                                        Sau1707
                                    </p>
                                    <p className="text-xs text-white/60">
                                        Leonardo Saurwein
                                    </p>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                    <Smile className="mr-2 h-4 w-4 text-white/70" />
                                    Set status
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <User className="mr-2 h-4 w-4 text-white/70" />
                                    Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <Building2 className="mr-2 h-4 w-4 text-white/70" />
                                    Organizations
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                    <Users className="mr-2 h-4 w-4 text-white/70" />
                                    Settings
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-300 focus:text-red-200">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Sign out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
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

function formatAppName(value: string) {
    const appNames: Record<string, string> = {
        viavai: 'ViaVai',
        atlas: 'Atlas',
        pulse: 'Pulse',
    };
    return appNames[value] ?? formatOrganizationName(value);
}
