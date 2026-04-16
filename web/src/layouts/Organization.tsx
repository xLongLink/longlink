import { useLocation, useNavigate } from 'react-router';
import type { ReactNode } from 'react';
import { Breadcrumb } from '@/components/breadcrumb';
import { UserProfile } from '@/components/Profile';
import { Tabs, TabsList, TabsTrigger } from '@/ui/tabs';
import { useApiData } from '@/hooks/use-data';
import { getActiveTabConfig, getAppTabsFromPages, type PageInfo } from '@/lib/navigation';

type OrganizationLayoutProps = {
    children: ReactNode;
};

export default function OrganizationLayout({ children }: OrganizationLayoutProps) {
    const location = useLocation();
    const navigate = useNavigate();

    const { data: pages, isLoading } = useApiData<PageInfo[]>('/pages');

    const tabs = isLoading
        ? []
        : getAppTabsFromPages(
              (pages ?? []).map((p) => ({
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

    const activeTab = location.pathname.startsWith('/profile')
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

                {tabs.length > 0 && (
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
                                const nextPath = nextTab.path ?? '';
                                navigate(nextPath === '' ? '/' : `/${nextPath}`);
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
                                            <Icon className="h-4 w-4" />
                                            {tab.label}
                                        </TabsTrigger>
                                    );
                                })}
                            </TabsList>
                        </Tabs>
                    </div>
                )}
            </header>

            <main className="mx-auto w-full max-w-6xl gap-8 px-6 pb-16 pt-10">
                <section className="space-y-6">{children}</section>
            </main>
        </div>
    );
}
