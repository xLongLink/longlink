import { useState } from 'react';
import { PanelLeft } from 'lucide-react';
import { SidebarContext } from '@/lib/sidebar';
import { Link } from '@astryxdesign/core/Link';
import { Wordmark } from '@/components/Wordmark';
import { Stack } from '@astryxdesign/core/Stack';
import Content from '@/components/layouts/Content';
import { useTheme } from '@astryxdesign/core/theme';
import { Divider } from '@astryxdesign/core/Divider';
import { AppShell } from '@astryxdesign/core/AppShell';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import type { NavigationLayoutProps } from '@/components/layouts/types';
import { BreadcrumbItem, Breadcrumbs } from '@astryxdesign/core/Breadcrumbs';
import { SideNav, SideNavItem, SideNavCollapseButton } from '@astryxdesign/core/SideNav';

/** Owns sidebar navigation, responsive collapse state, and the content toolbar. */
export default function Sidebar({
    action,
    activeTab,
    breadcrumb,
    children,
    homeHref = '/',
    sidebarHeader,
    tabs,
}: NavigationLayoutProps) {
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
                            <Stack gap={3} padding={1}>
                                {sidebarHeader ?? (
                                    <Link
                                        className={isCollapsed ? 'flex justify-center py-1.5' : 'w-full px-6 py-1.5'}
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
                        <Stack padding={2}>
                            {tabs.map((tab) => (
                                <SideNavItem
                                    href={tab.href}
                                    icon={tab.icon}
                                    isSelected={activeTab === tab.href}
                                    key={tab.href}
                                    label={tab.label}
                                    onClick={() => setIsMobileCollapsed(true)}
                                />
                            ))}
                        </Stack>
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
                                        {tabs.find((tab) => tab.href === activeTab)?.label}
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
