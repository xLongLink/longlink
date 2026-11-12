import { useState } from 'react';
import { PanelLeft } from 'lucide-react';
import { useLocation } from 'react-router';
import { SidebarContext } from '@/lib/sidebar';
import { Link } from '@/components/astryx/Link';
import { Wordmark } from '@/components/Wordmark';
import { Stack } from '@/components/astryx/Stack';
import Content from '@/components/layouts/Content';
import { useTheme } from '@astryxdesign/core/theme';
import { Divider } from '@/components/astryx/Divider';
import { AppShell } from '@/components/astryx/AppShell';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { BreadcrumbItem, Breadcrumbs } from '@/components/astryx/Breadcrumbs';
import type { NavigationTab, PlatformProps } from '@/components/layouts/types';
import { SideNav, SideNavItem, SideNavCollapseButton } from '@/components/astryx/SideNav';

/** Finds the longest platform tab path that matches a pathname. */
function findActiveTab(tabs: readonly NavigationTab[], pathname: string): string | undefined {
    const normalizedPathname = pathname.replace(/\/+$/, '') || '/';
    let bestTab: NavigationTab | undefined;
    let bestMatchLength = 0;

    // Rank normalized paths while retaining the original tab identity.
    for (const tab of tabs) {
        const tabPathname = tab.href.replace(/\/+$/, '') || '/';

        if (tabPathname !== normalizedPathname && !normalizedPathname.startsWith(`${tabPathname}/`)) {
            continue;
        }

        if (tabPathname.length > bestMatchLength) {
            bestTab = tab;
            bestMatchLength = tabPathname.length;
        }
    }

    return bestTab?.href;
}

/** Owns sidebar navigation, responsive collapse state, and the content toolbar. */
export default function Platform({
    action,
    activeTab,
    breadcrumb,
    children,
    homeHref = '/',
    sidebarHeader,
    tabs,
}: PlatformProps) {
    const { pathname } = useLocation();
    const selectedTab = activeTab ?? findActiveTab(tabs, pathname) ?? '';
    const { mode } = useTheme();
    const isSmallScreen = useMediaQuery('(width < 1024px)');
    const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
    const [isMobileCollapsed, setIsMobileCollapsed] = useState(true);
    const isCollapsed = isSmallScreen ? isMobileCollapsed : isDesktopCollapsed;
    const onCollapsedChange = isSmallScreen ? setIsMobileCollapsed : setIsDesktopCollapsed;
    const collapsible = { isCollapsed, onCollapsedChange, hasButton: false };

    return (
        <SidebarContext value={isCollapsed ? 'collapsed' : 'expanded'}>
            <AppShell
                height="auto"
                mobileNav={{ breakpoint: 'none', hasToggle: false }}
                sideNav={
                    <SideNav
                        aria-label="Section navigation"
                        collapsible={collapsible}
                        header={
                            <Stack className="w-full" gap={3}>
                                <Stack className="h-14 w-full shrink-0" justify="center">
                                    {sidebarHeader ?? (
                                        <Link
                                            className={
                                                isCollapsed ? 'flex justify-center py-1.5' : 'w-full px-6 py-1.5'
                                            }
                                            href={homeHref}
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
                                </Stack>
                                <Divider />
                            </Stack>
                        }
                        footer={
                            <Stack gap={3} padding={1}>
                                <Divider />
                                {action}
                            </Stack>
                        }
                    >
                        {tabs.map((tab) => (
                            <SideNavItem
                                href={tab.href}
                                icon={tab.icon}
                                isSelected={selectedTab === tab.href}
                                key={tab.href}
                                label={tab.label}
                                onClick={() => setIsMobileCollapsed(true)}
                            />
                        ))}
                    </SideNav>
                }
                variant="wash"
            >
                <Content
                    toolbar={
                        <Stack
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
                    }
                >
                    {children}
                </Content>
            </AppShell>
        </SidebarContext>
    );
}
