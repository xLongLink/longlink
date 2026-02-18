import { Loader2 } from 'lucide-react';
import {
    Link,
    Outlet,
    useLocation,
    useNavigate,
    useParams,
} from 'react-router';
import { Breadcrumb } from '@/components/breadcrumb';
import { UserProfile } from '@/components/Profile';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useData } from '@/hooks/use-data';
import {
    getActiveTabConfig,
    getAppTabsFromPages,
    getTabsConfig,
    NavigationIcon,
    type AppNavigationPage,
} from '@/lib/navigation';

type AppMetadata = {
    pages?: AppNavigationPage[];
};

type NavigationProps = {
    tabs: ReturnType<typeof getTabsConfig>['tabs'];
    basePathSuffix?: string;
    isTabsLoading?: boolean;
};

export default function Layout() {
    const { app } = useParams();
    const appMetadataEndpoint = app ? `/apps/${app}` : null;

    const { data: appMetadata, isLoading: isAppMetadataLoading } =
        useData<AppMetadata>(appMetadataEndpoint);
    const appTabs = app
        ? isAppMetadataLoading
            ? [
                  {
                      value: 'loading',
                      label: 'Loading',
                      path: '',
                      icon: Loader2,
                  },
              ]
            : getAppTabsFromPages(appMetadata?.pages ?? [])
        : undefined;

    const { tabs, basePathSuffix } = getTabsConfig({
        section: 'organization',
        app,
        appTabs,
    });

    return (
        <Navigation
            tabs={tabs}
            basePathSuffix={basePathSuffix}
            isTabsLoading={Boolean(app && isAppMetadataLoading)}
        />
    );
}

export function Navigation({
    tabs,
    basePathSuffix,
    isTabsLoading,
}: NavigationProps) {
    const { app } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const normalizedSuffix = basePathSuffix?.replace(/^\/+|\/+$/g, '') ?? '';
    const basePath = app
        ? normalizedSuffix
            ? `/${normalizedSuffix}`
            : '/'
        : '';

    const activeTabConfig = getActiveTabConfig({
        tabs,
        locationPath: location.pathname,
        basePath,
    });
    const activeTab = isTabsLoading
        ? 'loading'
        : location.pathname.startsWith('/profile')
          ? 'apps'
          : (activeTabConfig?.value ?? tabs[0]?.value ?? 'overview');

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
                                <NavigationIcon className="h-5 w-5" />
                            </Link>
                            <Breadcrumb />
                        </div>
                        <UserProfile />
                    </div>
                </div>

                {/* Tabs navigation */}
                <div className="mx-auto w-full px-6 pb-2">
                    <Tabs
                        value={activeTab}
                        onValueChange={(value) => {
                            if (isTabsLoading) {
                                return;
                            }
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
                                        disabled={isTabsLoading}
                                        className="cursor-pointer"
                                    >
                                        <Icon
                                            className={`h-4 w-4 ${tab.value === 'loading' ? 'animate-spin' : ''}`}
                                        />
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
