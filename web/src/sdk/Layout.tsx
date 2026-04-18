import { Loader2 } from 'lucide-react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { Tabs, TabsList, TabsTrigger } from '@/ui/tabs';
import { useApiData } from '@/hooks/use-data';
import { getActiveTabConfig, getAppTabsFromPages, type AppNavigationPage } from '@/lib/navigation';
import { getPagesFromResponse } from './pages';

type AppMetadata = {
    pages?: AppNavigationPage[];
};

export default function SdkLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { data: pagesResponse, isLoading } = useApiData<AppMetadata | AppNavigationPage[] | string>('/pages');
    const pages = getPagesFromResponse(pagesResponse);

    const sdkBasePath = import.meta.env.MODE === 'sdk' ? '' : '/sdk';

    const tabs = isLoading
        ? [
              {
                  value: 'loading',
                  label: 'Loading',
                  path: '',
                  icon: Loader2,
              },
          ]
        : getAppTabsFromPages(pages);

    const activeTabConfig = getActiveTabConfig({
        tabs,
        locationPath: sdkBasePath ? location.pathname.replace(/^\/sdk/, '') : location.pathname,
        basePath: '',
    });

    const activeTab = isLoading ? 'loading' : (activeTabConfig?.value ?? tabs[0]?.value ?? '');

    return (
        <div className="min-h-screen text-white">
            {tabs.length > 0 ? (
                <header className="border-b border-white/10">
                    <div className="mx-auto w-full px-6 pb-2 pt-4">
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
                                const nextPath = nextTab.path ?? '';
                                navigate(`${sdkBasePath}${nextPath === '' ? '' : `/${nextPath}`}`);
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
                </header>
            ) : null}

            <main className="mx-auto w-full max-w-6xl gap-8 px-6 pb-16 pt-10">
                <section className="space-y-6">
                    <Outlet />
                </section>
            </main>
        </div>
    );
}
