import Content from '@/components/layouts/content';
import { Separator } from '@/components/shadcn/separator';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { TooltipProvider } from '@/components/shadcn/tooltip';
import { Link as RouterLink, useLocation } from 'react-router';
import { useId, useRef, type ReactElement, type ReactNode } from 'react';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarSeparator,
    SidebarTrigger,
    useSidebar
} from '@/components/shadcn/sidebar';

type NavigationTab = { href: string; icon?: ReactElement; label: string };

type PlatformProps = {
    action: ReactNode;
    activeTab?: string;
    breadcrumb?: ReactNode;
    children: ReactNode;
    homeHref?: string;
    sidebarHeader?: ReactNode;
    tabs?: readonly NavigationTab[];
};

/** Finds the longest platform tab path that matches a pathname. */
function findActiveTab(tabs: readonly NavigationTab[], pathname: string): NavigationTab | undefined {
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

    return bestTab;
}

/** Owns sidebar navigation, responsive collapse state, and the content toolbar. */
export default function Platform(props: PlatformProps) {
    return (
        <TooltipProvider>
            <SidebarProvider className="relative min-h-[calc(100dvh-var(--\_app-shell-header-height,0px))] bg-background">
                <PlatformLayout {...props} />
            </SidebarProvider>
        </TooltipProvider>
    );
}

function PlatformLayout({
    action,
    activeTab,
    breadcrumb,
    children,
    homeHref = '/',
    sidebarHeader,
    tabs = []
}: PlatformProps) {
    const { pathname } = useLocation();
    const selectedTab =
        activeTab === undefined ? findActiveTab(tabs, pathname) : tabs.find((tab) => tab.href === activeTab);
    const { state, isMobile, openMobile, setOpenMobile } = useSidebar();
    const isCollapsed = !isMobile && state === 'collapsed';
    const expanded = isMobile ? openMobile : !isCollapsed;
    const mainId = useId();
    const navId = useId();
    const mainRef = useRef<HTMLElement>(null);

    return (
        <>
            <a
                className="absolute -m-px size-px overflow-hidden whitespace-nowrap [clip-path:inset(50%)] focus:fixed focus:top-2 focus:start-2 focus:z-[9999] focus:m-0 focus:h-auto focus:w-auto focus:overflow-visible focus:bg-card focus:px-4 focus:py-2 focus:text-foreground focus:[clip-path:none] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring focus-visible:outline-offset-2"
                href={`#${mainId}`}
                onClick={() => mainRef.current?.focus()}
            >
                Skip to content
            </a>
            <Sidebar
                collapsible="icon"
                className="top-[var(--\_app-shell-header-height,0px)] h-[calc(100dvh-var(--\_app-shell-header-height,0px))] group-data-[side=left]:border-r-0 group-data-[side=right]:border-l-0"
            >
                <SidebarHeader>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            {sidebarHeader ?? (
                                <SidebarMenuButton
                                    size="lg"
                                    render={<RouterLink to={homeHref} aria-label="LongLink home" />}
                                >
                                    {(['light', 'dark'] as const).map((mode) => (
                                        <img
                                            key={mode}
                                            alt="LongLink"
                                            className={`${isCollapsed ? 'size-8 object-contain' : 'h-auto w-full'} ${mode === 'light' ? 'block dark:hidden' : 'hidden dark:block'}`}
                                            height={isCollapsed ? 32 : 291}
                                            src={
                                                isCollapsed
                                                    ? `/longlink-logo-${mode}.png`
                                                    : `/images/longlink-wordmark-${mode}.png`
                                            }
                                            width={isCollapsed ? 32 : 1939}
                                        />
                                    ))}
                                </SidebarMenuButton>
                            )}
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarHeader>
                <SidebarSeparator />
                <SidebarContent>
                    <SidebarGroup>
                        <nav aria-label="Section navigation" id={navId}>
                            <SidebarMenu>
                                {tabs.map((tab) => (
                                    <SidebarMenuItem key={tab.href}>
                                        <SidebarMenuButton
                                            isActive={selectedTab?.href === tab.href}
                                            tooltip={{ children: tab.label, className: '[&[hidden]]:hidden' }}
                                            aria-label={tab.label}
                                            aria-current={selectedTab?.href === tab.href ? 'page' : undefined}
                                            onClick={(event) => {
                                                if (
                                                    event.defaultPrevented ||
                                                    event.button !== 0 ||
                                                    event.metaKey ||
                                                    event.ctrlKey ||
                                                    event.shiftKey ||
                                                    event.altKey
                                                )
                                                    return;
                                                setOpenMobile(false);
                                            }}
                                            render={<RouterLink to={tab.href} />}
                                        >
                                            {tab.icon && (
                                                <span
                                                    aria-hidden="true"
                                                    className="flex size-4 flex-none items-center justify-center [&_svg]:size-full"
                                                >
                                                    {tab.icon}
                                                </span>
                                            )}
                                            <span>{tab.label}</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </nav>
                    </SidebarGroup>
                </SidebarContent>
                <SidebarSeparator />
                <SidebarFooter>
                    <SidebarMenu>
                        <SidebarMenuItem>{action}</SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>
            </Sidebar>
            <main
                className="min-w-0 flex-1 pb-[env(safe-area-inset-bottom,0px)] outline-none"
                id={mainId}
                ref={mainRef}
                tabIndex={-1}
            >
                <Content
                    toolbar={
                        <section className="flex h-(--platform-toolbar-height) items-center gap-3 p-3">
                            <SidebarTrigger
                                type="button"
                                aria-controls={navId}
                                aria-expanded={expanded}
                                aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
                            />
                            <Separator className="h-5 data-[orientation=vertical]:self-center" orientation="vertical" />
                            {breadcrumb ?? <Breadcrumbs items={[{ label: selectedTab?.label }]} />}
                        </section>
                    }
                >
                    {children}
                </Content>
            </main>
        </>
    );
}
