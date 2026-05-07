import { Breadcrumb } from '@/components/Breadcrumb';
import { UserProfile } from '@/components/Profile';
import { useApiData } from '@/hooks/use-data';
import { getActiveTabConfig, getAppTabsFromPages, getDefaultTabValue, type AppNavigationPage } from '@/lib/navigation';
import { getRootPagesFromResponse } from '@/sdk/pages';
import { Tabs, TabsList, TabsTrigger } from '@/ui/tabs';
import { Loader2 } from 'lucide-react';
import { Outlet, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';

type AppMetadata = {
    pages?: AppNavigationPage[];
};

/**
 * Normalizes pages API response into navigation pages with icon fallback.
 * Supports both array and wrapped response shapes.
 */
const toNavigationPages = (value: unknown): AppNavigationPage[] => {
    return getRootPagesFromResponse(value).map((page) => ({
        path: page.path,
        name: page.name,
        icon: page.icon ?? 'file-text',
    }));
};

function OrgNavigation() {
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const { data: pagesResponse, isLoading } = useApiData<AppMetadata | AppNavigationPage[] | string>('/metadata.json');

    const pageList = toNavigationPages(pagesResponse);

    const tabs = getAppTabsFromPages(
        pageList.map((p) => ({
            name: p.name,
            path: p.path,
            icon: p.icon,
        }))
    );

    const activeTabConfig = getActiveTabConfig({
        tabs,
        locationPath: location.pathname,
        basePath: '',
    });

    const activeTab = searchParams.get('tab') ?? activeTabConfig?.value ?? getDefaultTabValue(tabs);

    if (tabs.length === 0) {
        return null;
    }

    return (
        <Tabs
            value={activeTab}
            onValueChange={(value) => {
                if (isLoading) {
                    return;
                }
                const nextTab = tabs.find((tab) => tab.value === value);
                if (!nextTab) {
                    return;
                }
                const nextSearchParams = new URLSearchParams(searchParams);
                nextSearchParams.set('tab', nextTab.value);
                setSearchParams(nextSearchParams, { replace: true });
            }}
        >
            <TabsList variant="line" className="gap-4">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <TabsTrigger key={tab.value} value={tab.value} className="cursor-pointer">
                            <Icon className="h-4 w-4" />
                            {tab.label}
                        </TabsTrigger>
                    );
                })}
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
    const appMetadataEndpoint = appId ? `/apps/${appId}/metadata` : null;
    const { data: appMetadata, isLoading: isAppMetadataLoading } = useApiData<AppMetadata>(appMetadataEndpoint);

    if (!appId) {
        return <OrgLayout />;
    }

    const tabs = isAppMetadataLoading
        ? [
              {
                  value: 'loading',
                  label: 'Loading',
                  path: '',
                  icon: Loader2,
              },
          ]
        : getAppTabsFromPages(
              getRootPagesFromResponse(appMetadata).map((page) => ({
                  path: page.path,
                  name: page.name,
                  icon: page.icon ?? 'file-text',
              }))
          );

    const basePath = `/applications/${appId}`;
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
