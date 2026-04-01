import { Loader2, PanelTop } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import type { ReactNode } from 'react';
import { Breadcrumb } from '@/components/breadcrumb';
import { UserProfile } from '@/components/Profile';
import { Card } from '@/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/ui/empty';
import { Tabs, TabsList, TabsTrigger } from '@/ui/tabs';
import { getActiveTabConfig, type NavigationTab } from '@/lib/navigation';

type ApplicationLayoutProps = {
    tabs: NavigationTab[];
    basePathSuffix?: string;
    isTabsLoading?: boolean;
    showEmptyAppSection?: boolean;
    children: ReactNode;
};

export default function ApplicationLayout({
    tabs,
    basePathSuffix,
    isTabsLoading,
    showEmptyAppSection,
    children,
}: ApplicationLayoutProps) {
    const location = useLocation();
    const navigate = useNavigate();

    const normalizedSuffix = basePathSuffix?.replace(/^\/+|\/+$/g, '') ?? '';
    const basePath = normalizedSuffix ? `/${normalizedSuffix}` : '/';

    const activeTabConfig = getActiveTabConfig({
        tabs,
        locationPath: location.pathname,
        basePath,
    });

    const activeTab = isTabsLoading ? 'loading' : (activeTabConfig?.value ?? tabs[0]?.value ?? '');

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
                                if (isTabsLoading) {
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
                                <EmptyDescription>This app has no configured tabs yet.</EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    </Card>
                ) : (
                    <section className="space-y-6">{children}</section>
                )}
            </main>
        </div>
    );
}

export function getLoadingApplicationTabs(): NavigationTab[] {
    return [
        {
            value: 'loading',
            label: 'Loading',
            path: '',
            icon: Loader2,
        },
    ];
}
