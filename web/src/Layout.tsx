import { Breadcrumb } from '@/components/Breadcrumb';
import { UserProfile } from '@/components/Profile';
import { useApiData } from '@/hooks/use-data';
import { getActiveTabConfig, getAppTabsFromPages, type AppNavigationPage } from '@/lib/navigation';
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

/**
 * Renders the shared page shell for sdk and api routes.
 */
export default function Layout() {
    const { org, application } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const isSdkMode = import.meta.env.MODE === 'sdk';
    const appMetadataEndpoint = application ? `/apps/${application}/metadata` : '/metadata.json';
    const { data: pagesResponse, isLoading } = useApiData<AppMetadata | AppNavigationPage[] | string>(
        appMetadataEndpoint
    );

    const tabs = isLoading
        ? [
              {
                  value: 'loading',
                  label: 'Loading',
                  path: '',
                  icon: Loader2,
              },
          ]
        : getAppTabsFromPages(toNavigationPages(pagesResponse));

    const activeTabConfig = getActiveTabConfig({
        tabs,
        locationPath: location.pathname,
        basePath: application ? `/${org}/${application}` : org ? `/${org}` : '',
    });

    const activeTab = isLoading
        ? 'loading'
        : (searchParams.get('tab') ?? activeTabConfig?.value ?? tabs[0]?.value ?? '');

    return (
        <div className="min-h-screen text-white">
            <header className="border-b border-white/10">
                <div className="mx-auto w-full px-6 pb-2 pt-4">
                    <div className="flex items-center justify-between gap-4 text-white/80">
                        <div className="flex items-center gap-4">
                            <Breadcrumb />
                        </div>
                        {isSdkMode ? null : <UserProfile />}
                    </div>
                </div>

                {tabs.length > 0 ? (
                    <div className="mx-auto w-full px-6 pb-2">
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

                                if (application) {
                                    navigate(`/${org}/${application}?${nextSearchParams.toString()}`);
                                    return;
                                }

                                if (org) {
                                    navigate(`/${org}?${nextSearchParams.toString()}`);
                                    return;
                                }

                                setSearchParams(nextSearchParams, { replace: true });
                            }}
                        >
                            <TabsList variant="line" className="gap-4">
                                {tabs.map((tab) => {
                                    const Icon = tab.icon;
                                    return (
                                        <TabsTrigger
                                            key={tab.value}
                                            value={tab.value}
                                            disabled={isLoading}
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
