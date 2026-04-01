import { useLocation, useNavigate } from 'react-router';
import type { ReactNode } from 'react';
import { Breadcrumb } from '@/components/breadcrumb';
import { UserProfile } from '@/components/Profile';
import { Tabs, TabsList, TabsTrigger } from '@/ui/tabs';
import { getActiveTabConfig, getTabsConfig } from '@/lib/navigation';

type OrganizationLayoutProps = {
    children: ReactNode;
};

export default function OrganizationLayout({ children }: OrganizationLayoutProps) {
    const location = useLocation();
    const navigate = useNavigate();

    const { tabs } = getTabsConfig({
        section: 'organization',
    });

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

                <div className="mx-auto w-full px-6 pb-2">
                    <Tabs
                        value={activeTab}
                        onValueChange={(value) => {
                            const nextTab = tabs.find((tab) => tab.value === value);
                            if (!nextTab) {
                                return;
                            }

                            const nextPath = nextTab.path ?? '';
                            navigate(nextPath === '' ? '/' : `/${nextPath}`);
                        }}
                    >
                        <TabsList variant="line" className="gap-4">
                            <TabsTrigger value="overview" className="cursor-pointer">
                                Overview
                            </TabsTrigger>
                            <TabsTrigger value="tools" className="cursor-pointer">
                                Tools
                            </TabsTrigger>
                            <TabsTrigger value="spaces" className="cursor-pointer">
                                Spaces
                            </TabsTrigger>
                            <TabsTrigger value="processes" className="cursor-pointer">
                                Processes
                            </TabsTrigger>
                            <TabsTrigger value="people" className="cursor-pointer">
                                People
                            </TabsTrigger>
                            <TabsTrigger value="settings" className="cursor-pointer">
                                Settings
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </header>

            <main className="mx-auto w-full max-w-6xl gap-8 px-6 pb-16 pt-10">
                <section className="space-y-6">{children}</section>
            </main>
        </div>
    );
}
