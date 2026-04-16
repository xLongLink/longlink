import { Loader2, BarChart3, Blocks, FolderKanban, Settings, Users, Workflow } from 'lucide-react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router';
import { Tabs, TabsList, TabsTrigger } from '@/ui/tabs';
import { Breadcrumb } from '@/components/breadcrumb';
import { UserProfile } from '@/components/Profile';
import { useApiData } from '@/hooks/use-data';
import { getActiveTabConfig, getAppTabsFromPages, type AppNavigationPage } from '@/lib/navigation';

type AppMetadata = {
    pages?: AppNavigationPage[];
};

const orgTabs = [
    { value: 'overview', label: 'Overview', path: 'overview', icon: BarChart3 },
    { value: 'tools', label: 'Tools', path: 'tools', icon: Blocks },
    { value: 'spaces', label: 'Spaces', path: 'spaces', icon: FolderKanban },
    { value: 'processes', label: 'Processes', path: 'processes', icon: Workflow },
    { value: 'people', label: 'People', path: 'people', icon: Users },
    { value: 'settings', label: 'Settings', path: 'settings', icon: Settings },
];

function OrgNavigation() {
    const location = useLocation();
    const navigate = useNavigate();

    const activeTabConfig = getActiveTabConfig({
        tabs: orgTabs,
        locationPath: location.pathname,
        basePath: '',
    });

    const activeTab = activeTabConfig?.value ?? orgTabs[0]?.value ?? '';

    return (
        <Tabs
            value={activeTab}
            onValueChange={(value) => {
                const nextTab = orgTabs.find((tab) => tab.value === value);
                if (!nextTab) {
                    return;
                }
                const nextPath = nextTab.path ?? '';
                navigate(nextPath === '' ? '/' : `/${nextPath}`);
            }}
        >
            <TabsList variant="line" className="gap-4">
                {orgTabs.map((tab) => (
                    <TabsTrigger key={tab.value} value={tab.value} className="cursor-pointer">
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </TabsTrigger>
                ))}
            </TabsList>
        </Tabs>
    );
}

function OrgLayout() {
    return (
        <div className="min-h-screen text-white">
            <header className="border-b border-white/10">
                <div className="mx-auto w-full px-6 pb-2 pt-4">
                    <div className="flex items-center justify-between gap-4 text-white/80">
                        <div className="flex items-center gap-4">
                            <Breadcrumb />
                        </div>
                        <UserProfile />
                    </div>
                </div>

                <div className="mx-auto w-full px-6 pb-2">
                    <OrgNavigation />
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

function AppLayout() {
    const { appId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    if (!appId) {
        return <OrgLayout />;
    }

    const appMetadataEndpoint = `/apps/${appId}`;
    const { data: appMetadata, isLoading: isAppMetadataLoading } = useApiData<AppMetadata>(appMetadataEndpoint);

    const tabs = isAppMetadataLoading
        ? [
              {
                  value: 'loading',
                  label: 'Loading',
                  path: '',
                  icon: Loader2,
              },
          ]
        : getAppTabsFromPages(appMetadata?.pages ?? []);

    const basePath = `/${appId}`;
    const activeTabConfig = getActiveTabConfig({
        tabs,
        locationPath: location.pathname,
        basePath,
    });

    const activeTab = isAppMetadataLoading ? 'loading' : (activeTabConfig?.value ?? tabs[0]?.value ?? '');

    return (
        <div className="min-h-screen text-white">
            <header className="border-b border-white/10">
                <div className="mx-auto w-full px-6 pb-2 pt-4">
                    <div className="flex items-center justify-between gap-4 text-white/80">
                        <div className="flex items-center gap-4">
                            <Breadcrumb />
                        </div>
                        <UserProfile />
                    </div>
                </div>

                {tabs.length > 0 ? (
                    <div className="mx-auto w-full px-6 pb-2">
                        <Tabs
                            value={activeTab}
                            onValueChange={(value) => {
                                if (isAppMetadataLoading) {
                                    return;
                                }
                                const nextTab = tabs.find((tab) => tab.value === value);
                                if (!nextTab) {
                                    return;
                                }
                                const nextPath = nextTab.path ?? '';
                                navigate(nextPath === '' ? basePath : `${basePath}/${nextPath}`);
                            }}
                        >
                            <TabsList variant="line" className="gap-4">
                                {tabs.map((tab) => {
                                    const Icon = tab.icon;
                                    return (
                                        <TabsTrigger
                                            key={tab.value}
                                            value={tab.value}
                                            disabled={isAppMetadataLoading}
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
                ) : null}
            </header>

            <main className="mx-auto w-full max-w-6xl gap-8 px-6 pb-16 pt-10">
                <section className="space-y-6">
                    <Outlet />
                </section>
            </main>
        </div>
    );
}

export default function Layout() {
    return <AppLayout />;
}
