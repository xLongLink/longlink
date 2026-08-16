import { Outlet, useLocation } from 'react-router';
import { Stack } from '@astryxdesign/core/Stack';
import { TopNav } from '@astryxdesign/core/TopNav';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { Auth } from '@/components/Auth';
import { AccountAction } from '@/components/AccountAction';
import { PageBreadcrumb } from '@/components/breadcrumb/Page';
import { PageContainer } from '@/components/PageContainer';
import Platform from '@/components/layouts/Platform';
import { useCurrentUser } from '@/lib/hooks/use-user';
import { findActiveTab } from '@/lib/paths';
import { administratorTabs } from '@/platform/tabs';

/** Renders the authorized admin shell with tabbed navigation. */
export default function Admin() {
    const { pathname } = useLocation();
    const { user } = useCurrentUser();
    const activeTab = findActiveTab(administratorTabs, pathname);

    return (
        <Auth requiresAdministrator>
            <Platform
                topNav={
                    <Stack gap={0}>
                        <TopNav
                            className="min-h-11 px-7"
                            endContent={<AccountAction user={user ?? null} />}
                            heading={<PageBreadcrumb />}
                            label="Main navigation"
                        />
                        {user ? (
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
                        ) : null}
                    </Stack>
                }
            >
                <PageContainer gap={8}>
                    <Outlet />
                </PageContainer>
            </Platform>
        </Auth>
    );
}
