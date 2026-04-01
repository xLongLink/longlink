import { Loader2 } from 'lucide-react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { Tabs, TabsList, TabsTrigger } from '@/ui/tabs';
import { useApiData } from '@/hooks/use-data';
import {
    getActiveTabConfig,
    getAppTabsFromPages,
    type AppNavigationPage,
} from '@/lib/navigation';

type AppMetadata = {
    pages?: AppNavigationPage[];
};

export default function Layout() {
    const { data: appMetadata, isLoading } = useApiData<AppMetadata>('/pages');

    const tabs = isLoading
        ? [
              {
                  value: 'loading',
                  label: 'Loading',
                  path: '',
                  icon: Loader2,
              },
          ]
        : getAppTabsFromPages(appMetadata?.pages ?? []);

    return <Navigation tabs={tabs} isTabsLoading={isLoading} />;
}

function Navigation({
    tabs,
    isTabsLoading,
}: {
    tabs: ReturnType<typeof getAppTabsFromPages>;
    isTabsLoading: boolean;
}) {
    const location = useLocation();
    const navigate = useNavigate();

    const activeTabConfig = getActiveTabConfig({
        tabs,
        locationPath: location.pathname,
        basePath: '',
    });

    const activeTab = isTabsLoading
        ? 'loading'
        : (activeTabConfig?.value ?? tabs[0]?.value ?? '');

    return (
        <div className="min-h-screen text-white">
            {tabs.length > 0 ? (
                <header className="border-b border-white/10">
                    <div className="mx-auto w-full px-6 pb-2 pt-4">
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
                                navigate(
                                    nextPath === '' ? '/' : `/${nextPath}`
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
            ) : null}

            <main className="mx-auto w-full max-w-6xl gap-8 px-6 pb-16 pt-10">
                <section className="space-y-6">
                    <Outlet />
                </section>
            </main>
        </div>
    );
}
