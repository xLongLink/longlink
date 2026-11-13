import { PanelLeft } from 'lucide-react';
import { SidebarContext } from '@/lib/sidebar';
import { Button } from '@base-ui/react/button';
import { useId, useRef, useState } from 'react';
import Content from '@/components/layouts/content';
import { Separator } from '@/components/shadcn/separator';
import { useAppearance } from '@/lib/hooks/use-appearance';
import { useMediaQuery } from '@/lib/hooks/use-media-query';
import { Link as RouterLink, useLocation } from 'react-router';
import { TypographyTooltip } from '@/components/custom/typography-tooltip';
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
            <section
                className="group/platform relative flex min-h-dvh overflow-clip bg-background"
                data-collapsed={isCollapsed || undefined}
            >
                <a
                    className="absolute -m-px size-px overflow-hidden whitespace-nowrap [clip-path:inset(50%)] focus:fixed focus:top-2 focus:start-2 focus:z-[9999] focus:m-0 focus:h-auto focus:w-auto focus:overflow-visible focus:bg-surface focus:px-4 focus:py-2 focus:text-foreground focus:[clip-path:none] focus-visible:outline-(length:--focus-outline-width) focus-visible:outline-solid focus-visible:outline-ring focus-visible:outline-offset-(--focus-outline-offset)"
                    href={`#${mainId}`}
                    onClick={() => mainRef.current?.focus()}
                >
                    Skip to content
                </a>
                <nav
                    aria-label="Section navigation"
                    className="sticky top-[var(--\_app-shell-header-height,0px)] flex h-[calc(100dvh-var(--\_app-shell-header-height,0px))] min-h-0 w-[260px] flex-[0_0_260px] flex-col overflow-hidden bg-inherit group-data-collapsed/platform:w-12 group-data-collapsed/platform:basis-12"
                    id={navId}
                >
                    <header className="flex flex-none flex-col gap-3 p-2">
                        <section className="flex h-14 w-full flex-none flex-col justify-center">
                            {sidebarHeader ?? (
                                <RouterLink
                                    aria-label="LongLink home"
                                    className="flex w-full px-6 py-1.5 text-inherit no-underline group-data-collapsed/platform:justify-center group-data-collapsed/platform:px-0 focus-visible:outline-(length:--focus-outline-width) focus-visible:outline-solid focus-visible:outline-ring focus-visible:outline-offset-(--focus-outline-offset)"
                                    to={homeHref}
                                >
                                    <img
                                        alt="LongLink"
                                        className={isCollapsed ? 'size-8 object-contain' : 'block h-auto w-full'}
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
                        <Separator />
                    </header>
                    <section className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-2 py-1">
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
                                    className="box-border flex min-h-(--size-element-md) w-full items-center gap-2 rounded-(--radius-element) px-2 text-(length:--text-label-size) leading-(--text-label-leading) text-muted-foreground no-underline [&[aria-current]]:bg-secondary [&[aria-current]]:font-medium [&[aria-current]]:text-foreground [&[hidden]]:hidden group-data-collapsed/platform:size-(--size-element-md) group-data-collapsed/platform:justify-center group-data-collapsed/platform:px-0 focus-visible:outline-(length:--focus-outline-width) focus-visible:outline-solid focus-visible:outline-ring focus-visible:outline-offset-(--focus-outline-offset) [&:not([aria-current]):hover]:[@media(hover:hover)]:bg-[linear-gradient(var(--color-overlay-hover),var(--color-overlay-hover))] [&:not([aria-current]):active]:bg-[linear-gradient(var(--color-overlay-pressed),var(--color-overlay-pressed))] forced-colors:[&[aria-current]]:bg-[Highlight] forced-colors:[&[aria-current]]:text-[HighlightText]"
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
                                        <span
                                            aria-hidden="true"
                                            className="flex size-4 flex-none items-center justify-center [&_svg]:size-full"
                                        >
                                            {tab.icon}
                                        </span>
                                    )}
                                    <span className="min-w-0 truncate group-data-collapsed/platform:hidden">
                                        {tab.label}
                                    </span>
                                </RouterLink>
                            </TypographyTooltip>
                        ))}
                    </section>
                    <footer className="flex-none px-2 pt-1 pb-2 group-data-collapsed/platform:flex group-data-collapsed/platform:justify-center group-data-collapsed/platform:pt-0">
                        <section className="flex flex-col gap-3 p-1 group-data-collapsed/platform:flex-none">
                            <Separator />
                            {action}
                        </section>
                    </footer>
                </nav>
                <main
                    className="min-w-0 flex-1 pb-[env(safe-area-inset-bottom,0px)] outline-none"
                    id={mainId}
                    ref={mainRef}
                    tabIndex={-1}
                >
                    <Content
                        toolbar={
                            <section className="flex h-(--platform-toolbar-height) items-center gap-3 p-3">
                                <Button
                                    aria-controls={navId}
                                    aria-expanded={!isCollapsed}
                                    aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                                    className="inline-flex size-(--size-element-md) flex-none cursor-pointer items-center justify-center rounded-(--radius-element) border-0 bg-transparent p-0 text-foreground hover:bg-[linear-gradient(var(--color-overlay-hover),var(--color-overlay-hover))] active:bg-[linear-gradient(var(--color-overlay-pressed),var(--color-overlay-pressed))] focus-visible:outline-(length:--focus-outline-width) focus-visible:outline-solid focus-visible:outline-ring focus-visible:outline-offset-(--focus-outline-offset)"
                                    onClick={() => onCollapsedChange(!isCollapsed)}
                                    type="button"
                                >
                                    <PanelLeft aria-hidden="true" size={16} />
                                </Button>
                                <Separator className="h-5" orientation="vertical" />
                                {breadcrumb ?? (
                                    <nav aria-label="Breadcrumb">
                                        <ol className="m-0 list-none p-0 text-(length:--text-body-size) leading-(--text-body-leading) font-semibold">
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
