import { useLocation } from 'react-router';
import { Card } from '@astryxdesign/core/Card';
import { Link } from '@astryxdesign/core/Link';
import type { LucideIcon } from 'lucide-react';
import { Wordmark } from '@/components/Wordmark';
import { Stack } from '@astryxdesign/core/Stack';
import { TopNav } from '@astryxdesign/core/TopNav';
import { Divider } from '@astryxdesign/core/Divider';
import { AppShell } from '@astryxdesign/core/AppShell';
import { useAppearance } from '@/components/Appearance';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { SideNav, SideNavItem } from '@astryxdesign/core/SideNav';
import { OrganizationSwitcher } from '@/components/PageBreadcrumb';
import { createContext, isValidElement, type ReactElement, type ReactNode } from 'react';

export const SidebarContext = createContext(false);

export type NavigationTab = {
    href: string;
    icon?: LucideIcon | ReactElement;
    label: string;
};

type PlatformProps = {
    action: ReactNode;
    activeTab?: string;
    breadcrumb?: ReactNode;
    children: ReactNode;
    tabs: readonly NavigationTab[];
};

/** Finds the longest platform tab path that matches a pathname. */
function findActiveTab(tabs: readonly NavigationTab[], pathname: string): string | undefined {
    const normalizedPathname = pathname.replace(/\/+$/, '') || '/';

    return tabs.reduce<string | undefined>((best, tab) => {
        const tabPathname = tab.href.replace(/\/+$/, '') || '/';

        if (tabPathname !== normalizedPathname && !normalizedPathname.startsWith(`${tabPathname}/`)) {
            return best;
        }

        return best === undefined || tabPathname.length > best.length ? tabPathname : best;
    }, undefined);
}

/** Renders the shared Platform frame with contextual navigation and actions. */
export default function Platform({ action, activeTab, breadcrumb, children, tabs }: PlatformProps) {
    const { pathname } = useLocation();
    const { appearance } = useAppearance();

    // Both layouts share the same links and route selection, including query-based categories.
    const selectedTab = activeTab ?? findActiveTab(tabs, pathname) ?? '';
    const hasSidebar = appearance.navigation === 'sidebar' && tabs.length > 0;
    const hasOrganizationSidebar = hasSidebar && pathname.startsWith('/orgs/');
    const organization = pathname.split('/')[2] ?? '';

    return (
        <AppShell
            height="auto"
            mobileNav={hasSidebar ? { breakpoint: 'lg' } : false}
            sideNav={
                hasSidebar ? (
                    <SideNav
                        aria-label="Section navigation"
                        header={
                            hasOrganizationSidebar ? (
                                <Stack padding={1}>
                                    <OrganizationSwitcher organization={organization} isSidebar />
                                </Stack>
                            ) : undefined
                        }
                        footer={
                            <SidebarContext value={true}>
                                <Stack gap={3} padding={1}>
                                    <Divider />
                                    {action}
                                </Stack>
                            </SidebarContext>
                        }
                    >
                        <Stack padding={2}>
                            {tabs.map((tab) => {
                                const Icon = tab.icon;

                                return (
                                    <SideNavItem
                                        href={tab.href}
                                        icon={
                                            isValidElement(Icon) ? (
                                                Icon
                                            ) : Icon ? (
                                                <Icon aria-hidden="true" size={16} />
                                            ) : undefined
                                        }
                                        isSelected={selectedTab === tab.href}
                                        key={tab.href}
                                        label={tab.label}
                                    />
                                );
                            })}
                        </Stack>
                    </SideNav>
                ) : undefined
            }
            topNav={
                <Stack className={hasOrganizationSidebar ? 'lg:hidden' : undefined}>
                    <TopNav
                        className="min-h-11 px-7"
                        endContent={hasSidebar ? undefined : action}
                        heading={
                            hasOrganizationSidebar ? (
                                <OrganizationSwitcher organization={organization} isSidebar />
                            ) : (
                                (breadcrumb ?? (
                                    <Link href="/" label="LongLink home" color="inherit">
                                        <Wordmark />
                                    </Link>
                                ))
                            )
                        }
                        label="Platform navigation"
                    />
                    {!hasSidebar && tabs.length > 0 && (
                        <Stack direction="horizontal" paddingInline={4} width="100%">
                            <TabList
                                aria-label="Section navigation"
                                onChange={() => undefined}
                                size="sm"
                                value={selectedTab}
                            >
                                {tabs.map((tab) => {
                                    const Icon = tab.icon;

                                    return (
                                        <Tab
                                            href={tab.href}
                                            icon={
                                                isValidElement(Icon) ? (
                                                    Icon
                                                ) : Icon ? (
                                                    <Icon aria-hidden="true" size={16} />
                                                ) : undefined
                                            }
                                            key={tab.href}
                                            label={tab.label}
                                            value={tab.href}
                                        />
                                    );
                                })}
                            </TabList>
                        </Stack>
                    )}
                </Stack>
            }
            variant="wash"
        >
            {/* Cover at least the main region and grow the background with overflowing View content. */}
            <Stack className="relative" minHeight="calc(100dvh - var(--_app-shell-header-height, 0px))">
                <Card
                    aria-hidden="true"
                    className={`pointer-events-none absolute z-0 inset-0 overflow-clip bg-body px-2 pb-2 ${hasOrganizationSidebar ? 'pt-2' : 'pt-0'}`}
                    padding={0}
                    variant="transparent"
                >
                    <Card className="border-0" height="100%" width="100%" />
                </Card>
                <Stack className="relative z-10" padding={2}>
                    {children}
                </Stack>
            </Stack>
        </AppShell>
    );
}
