import { Stack } from '@astryxdesign/core/Stack';
import { TopNav } from '@astryxdesign/core/TopNav';
import { Outlet, useLocation } from 'react-router';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { Auth } from '@/components/Auth';
import { administratorTabs } from '@/lib/administrator';
import { findActiveTab } from '@/lib/paths';
import { ProfileMenu } from '@/components/Profile';
import TopLayout from '@/components/layouts/TopLayout';
import { PageContainer } from '@/components/PageContainer';
import { useAuthenticatedUser } from '@/lib/hooks/use-user';
import { PageBreadcrumb } from '@/components/breadcrumb/Page';

/** Renders the authorized admin shell with tabbed navigation. */
export default function Admin() {
    return (
        <Auth requiresAdministrator>
            <AdminContent />
        </Auth>
    );
}

/** Renders administrator navigation after the administrator guard passes. */
function AdminContent() {
    const { pathname } = useLocation();
    const user = useAuthenticatedUser();
    const activeTab = findActiveTab(administratorTabs, pathname);

    return (
        <TopLayout
            topMenu={
                <Stack gap={0}>
                    <TopNav
                        className="min-h-11 px-7"
                        endContent={<ProfileMenu user={user} />}
                        heading={<PageBreadcrumb />}
                        label="Main navigation"
                    />
                    <Stack direction="horizontal" isScrollable paddingInline={4} width="100%">
                        <TabList
                            aria-label="Section navigation"
                            hasDivider
                            onChange={() => undefined}
                            size="sm"
                            value={activeTab ?? ''}
                        >
                            {administratorTabs.map((tab) => {
                                const TabIcon = tab.icon;

                                return (
                                    <Tab
                                        key={tab.label}
                                        href={tab.href}
                                        icon={<TabIcon aria-hidden="true" size={16} />}
                                        label={tab.label}
                                        value={tab.href}
                                    />
                                );
                            })}
                        </TabList>
                    </Stack>
                </Stack>
            }
        >
            <PageContainer gap={8}>
                <Outlet />
            </PageContainer>
        </TopLayout>
    );
}
