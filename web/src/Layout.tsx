import { Loader2, PanelTop } from 'lucide-react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router';
import { Breadcrumb } from '@/components/breadcrumb';
import { UserProfile } from '@/components/Profile';
import { Card } from '@/ui/card';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/ui/empty';
import { Tabs, TabsList, TabsTrigger } from '@/ui/tabs';
import { useApiData } from '@/hooks/use-data';
import {
    getActiveTabConfig,
    getAppTabsFromPages,
    getTabsConfig,
    type AppNavigationPage,
} from '@/lib/navigation';

type AppMetadata = {
    pages?: AppNavigationPage[];
};

type NavigationProps = {
    tabs: ReturnType<typeof getTabsConfig>['tabs'];
    basePathSuffix?: string;
    isTabsLoading?: boolean;
    showEmptyAppSection?: boolean;
};

export default function Layout() {
    const { appId } = useParams();
    const appMetadataEndpoint = appId ? `/apps/${appId}` : null;

    const { data: appMetadata, isLoading: isAppMetadataLoading } =
        useApiData<AppMetadata>(appMetadataEndpoint);
    const appTabs = appId
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
        appId,
        appTabs,
    });

    const showEmptyAppSection = Boolean(
        appId && !isAppMetadataLoading && tabs.length === 0
    );

    return (
        <Navigation
            tabs={tabs}
            basePathSuffix={basePathSuffix}
            isTabsLoading={Boolean(appId && isAppMetadataLoading)}
            showEmptyAppSection={showEmptyAppSection}
        />
    );
}

export function Navigation({
    tabs,
    basePathSuffix,
    isTabsLoading,
    showEmptyAppSection,
}: NavigationProps) {
    const { appId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const normalizedSuffix = basePathSuffix?.replace(/^\/+|\/+$/g, '') ?? '';
    const basePath = appId
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
          ? (tabs[0]?.value ?? '')
          : (activeTabConfig?.value ?? tabs[0]?.value ?? '');

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

                {/* Tabs navigation */}
                {tabs.length > 0 ? (
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
                ) : null}
            </header>

            <main className="mx-auto w-full max-w-6xl gap-8 px-6 pb-16 pt-10">
                {showEmptyAppSection ? (
                    <Card className="p-10 text-center">
                        <Empty>
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <PanelTop />
                                </EmptyMedia>
                                <EmptyTitle>No Tabs Yet</EmptyTitle>
                                <EmptyDescription>
                                    This app has no configured tabs yet.
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    </Card>
                ) : (
                    <section className="space-y-6">
                        <Outlet />
                    </section>
                )}
            </main>
        </div>
    );
}
