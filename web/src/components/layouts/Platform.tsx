import { PanelLeft } from 'lucide-react';
import { useLocation } from 'react-router';
import { Card } from '@astryxdesign/core/Card';
import { Link } from '@astryxdesign/core/Link';
import type { LucideIcon } from 'lucide-react';
import { Wordmark } from '@/components/Wordmark';
import { Stack } from '@astryxdesign/core/Stack';
import { TopNav } from '@astryxdesign/core/TopNav';
import { useTheme } from '@astryxdesign/core/theme';
import { Divider } from '@astryxdesign/core/Divider';
import { AppShell } from '@astryxdesign/core/AppShell';
import { useAppearance } from '@/components/Appearance';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { OrganizationSwitcher } from '@/components/PageBreadcrumb';
import { BreadcrumbItem, Breadcrumbs } from '@astryxdesign/core/Breadcrumbs';
import { SideNav, SideNavItem, SideNavCollapseButton } from '@astryxdesign/core/SideNav';
import { createContext, isValidElement, useState, type ReactElement, type ReactNode } from 'react';

export const SidebarContext = createContext<'expanded' | 'collapsed' | null>(null);

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
    const { mode } = useTheme();
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Both layouts share the same links and route selection, including query-based categories.
    const selectedTab = activeTab ?? findActiveTab(tabs, pathname) ?? '';
    const hasSidebar = appearance.navigation === 'sidebar' && tabs.length > 0;
    const hasOrganizationSidebar = hasSidebar && pathname.startsWith('/orgs/');
    const hasDashboardSidebar = hasOrganizationSidebar || (hasSidebar && pathname.startsWith('/user/'));
    const organization = pathname.split('/')[2] ?? '';
    const collapsible = { isCollapsed, onCollapsedChange: setIsCollapsed, hasButton: false };

    return (
        <AppShell
            height="auto"
            mobileNav={hasSidebar ? { breakpoint: 'lg' } : false}
            sideNav={
                hasSidebar ? (
                    <SideNav
                        aria-label="Section navigation"
                        collapsible={collapsible}
                        header={
                            hasDashboardSidebar ? (
                                <Stack gap={3} padding={1}>
                                    {hasOrganizationSidebar ? (
                                        <OrganizationSwitcher
                                            organization={organization}
                                            isSidebar
                                            isCollapsed={isCollapsed}
                                        />
                                    ) : (
                                        <Link
                                            className={
                                                isCollapsed ? 'flex justify-center py-1.5' : 'w-full px-6 py-1.5'
                                            }
                                            href="/user/organizations"
                                            label="LongLink home"
                                            color="inherit"
                                        >
                                            {isCollapsed ? (
                                                <img
                                                    alt="LongLink"
                                                    className="size-8 object-contain"
                                                    src={`/longlink-logo-${mode}.png`}
                                                />
                                            ) : (
                                                <Wordmark size="full" />
                                            )}
                                        </Link>
                                    )}
                                    <Divider />
                                </Stack>
                            ) : undefined
                        }
                        footer={
                            <SidebarContext value={isCollapsed ? 'collapsed' : 'expanded'}>
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
                <Stack className={hasSidebar ? 'lg:hidden' : undefined}>
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
            <Stack
                className={
                    hasSidebar
                        ? 'relative lg:[--platform-toolbar-height:calc(var(--size-element-md)+var(--spacing-3)*2)]'
                        : 'relative'
                }
                minHeight="calc(100dvh - var(--_app-shell-header-height, 0px))"
            >
                <Card
                    aria-hidden="true"
                    className={`pointer-events-none absolute z-0 inset-0 overflow-clip bg-body px-2 pb-2 ${hasSidebar ? 'pt-2' : 'pt-0'}`}
                    padding={0}
                    variant="transparent"
                >
                    <Card className="border-0" height="100%" width="100%" />
                </Card>
                <Stack className="relative z-10" padding={2}>
                    {hasSidebar && (
                        <Stack
                            className="hidden lg:flex"
                            direction="horizontal"
                            align="center"
                            gap={3}
                            height="var(--platform-toolbar-height)"
                            padding={3}
                        >
                            <SideNavCollapseButton collapsible={collapsible}>
                                <PanelLeft aria-hidden="true" size={16} />
                            </SideNavCollapseButton>
                            <Divider className="h-5" orientation="vertical" />
                            {breadcrumb ?? (
                                <Breadcrumbs>
                                    <BreadcrumbItem isCurrent>
                                        {tabs.find((tab) => tab.href === selectedTab)?.label}
                                    </BreadcrumbItem>
                                </Breadcrumbs>
                            )}
                        </Stack>
                    )}
                    {children}
                </Stack>
            </Stack>
        </AppShell>
    );
}
