import { PanelLeft } from 'lucide-react';
import { SidebarContext } from '@/lib/sidebar';
import { Button } from '@base-ui/react/button';
import { useId, useRef, useState } from 'react';
import { Divider } from '@/components/ui/Divider';
import Content from '@/components/layouts/Content';
import { useAppearance } from '@/lib/hooks/use-appearance';
import { useMediaQuery } from '@/lib/hooks/use-media-query';
import { Link as RouterLink, useLocation } from 'react-router';
import { TypographyTooltip } from '@/components/ui/TypographyTooltip';
import type { NavigationTab, PlatformProps } from '@/components/layouts/types';

/** Finds the longest platform tab path that matches a pathname. */
function findActiveTab(tabs: readonly NavigationTab[], pathname: string): string | undefined {
    const normalizedPathname = pathname.replace(/\/+$/, '') || '/';
    let bestTab: NavigationTab | undefined;
    let bestMatchLength = 0;

    // Rank normalized paths while retaining the original tab identity.
    for (const tab of tabs) {
        const tabPathname = tab.href.replace(/\/+$/, '') || '/';

        if (tabPathname !== normalizedPathname && !normalizedPathname.startsWith(`${tabPathname}/`)) continue;

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
    tabs
}: PlatformProps) {
    const { pathname } = useLocation();
    const selectedTab = activeTab ?? findActiveTab(tabs, pathname) ?? '';
    const { appearance } = useAppearance();
    const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
    const mode = appearance.theme === 'system' ? (prefersDark ? 'dark' : 'light') : appearance.theme;
    const isSmallScreen = useMediaQuery('(width < 1024px)');
    const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
    const [isMobileCollapsed, setIsMobileCollapsed] = useState(true);
    const isCollapsed = isSmallScreen ? isMobileCollapsed : isDesktopCollapsed;
    const onCollapsedChange = isSmallScreen ? setIsMobileCollapsed : setIsDesktopCollapsed;
    const mainId = useId();
    const navId = useId();
    const mainRef = useRef<HTMLElement>(null);

    return (
        <SidebarContext value={isCollapsed ? 'collapsed' : 'expanded'}>
            <section className="platform-shell" data-collapsed={isCollapsed || undefined}>
                <a className="platform-skip-link" href={`#${mainId}`} onClick={() => mainRef.current?.focus()}>
                    Skip to content
                </a>
                <nav aria-label="Section navigation" className="platform-sidebar" id={navId}>
                    <header className="platform-sidebar-header">
                        <section className="platform-sidebar-brand">
                            {sidebarHeader ?? (
                                <RouterLink aria-label="LongLink home" className="platform-home" to={homeHref}>
                                    <img
                                        alt="LongLink"
                                        className={isCollapsed ? 'platform-logo' : 'platform-wordmark'}
                                        height={isCollapsed ? 32 : 286}
                                        src={
                                            isCollapsed
                                                ? `/longlink-logo-${mode}.png`
                                                : `/images/longlink-wordmark-${mode}.png`
                                        }
                                        width={isCollapsed ? 32 : 1781}
                                    />
                                </RouterLink>
                            )}
                        </section>
                        <Divider />
                    </header>
                    <section className="platform-sidebar-items">
                        {tabs.map((tab) => (
                            <TypographyTooltip
                                key={tab.href}
                                content={tab.label}
                                enabled={isCollapsed && !!tab.icon}
                                placement="end"
                            >
                                <RouterLink
                                    aria-current={selectedTab === tab.href ? 'page' : undefined}
                                    aria-label={tab.label}
                                    className="platform-sidebar-link"
                                    hidden={isCollapsed && !tab.icon}
                                    tabIndex={isCollapsed && !tab.icon ? -1 : undefined}
                                    to={tab.href}
                                    onClick={(event) => {
                                        // Native and cancelled gestures must not change the current sidebar.
                                        if (
                                            event.defaultPrevented ||
                                            event.button !== 0 ||
                                            event.metaKey ||
                                            event.ctrlKey ||
                                            event.shiftKey ||
                                            event.altKey
                                        )
                                            return;

                                        setIsMobileCollapsed(true);
                                    }}
                                >
                                    {tab.icon && (
                                        <span aria-hidden="true" className="platform-sidebar-icon">
                                            {tab.icon}
                                        </span>
                                    )}
                                    <span className="platform-sidebar-label">{tab.label}</span>
                                </RouterLink>
                            </TypographyTooltip>
                        ))}
                    </section>
                    <footer className="platform-sidebar-footer">
                        <section className="platform-sidebar-action">
                            <Divider />
                            {action}
                        </section>
                    </footer>
                </nav>
                <main className="platform-main" id={mainId} ref={mainRef} tabIndex={-1}>
                    <Content
                        toolbar={
                            <section className="platform-toolbar">
                                <Button
                                    aria-controls={navId}
                                    aria-expanded={!isCollapsed}
                                    aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                                    className="platform-sidebar-toggle"
                                    onClick={() => onCollapsedChange(!isCollapsed)}
                                    type="button"
                                >
                                    <PanelLeft aria-hidden="true" size={16} />
                                </Button>
                                <Divider className="h-5" orientation="vertical" />
                                {breadcrumb ?? (
                                    <nav aria-label="Breadcrumb" className="platform-breadcrumb">
                                        <ol>
                                            <li aria-current="page">
                                                {tabs.find((tab) => tab.href === selectedTab)?.label}
                                            </li>
                                        </ol>
                                    </nav>
                                )}
                            </section>
                        }
                    >
                        {children}
                    </Content>
                </main>
            </section>
        </SidebarContext>
    );
}
