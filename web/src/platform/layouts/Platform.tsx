import type { ReactNode } from 'react';
import { useLocation } from 'react-router';
import { Card } from '@astryxdesign/core/Card';
import { Link } from '@astryxdesign/core/Link';
import type { LucideIcon } from 'lucide-react';
import { Wordmark } from '@/components/Wordmark';
import { Stack } from '@astryxdesign/core/Stack';
import { TopNav } from '@astryxdesign/core/TopNav';
import { AppShell } from '@astryxdesign/core/AppShell';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { DevelopmentNotice } from '@/components/DevelopmentNotice';

export type NavigationTab = {
    href: string;
    icon?: LucideIcon;
    label: string;
};

type PlatformProps = {
    action: ReactNode;
    activeTab?: string;
    breadcrumb?: ReactNode;
    children: ReactNode;
    isContentCentered?: boolean;
    contentMinHeight?: string;
    isDevelopmentNoticeShown?: boolean;
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
export default function Platform({
    action,
    activeTab,
    breadcrumb,
    children,
    isContentCentered = false,
    contentMinHeight = 'calc(100dvh - var(--_app-shell-header-height, 0px))',
    isDevelopmentNoticeShown = true,
    tabs,
}: PlatformProps) {
    const { pathname } = useLocation();

    return (
        <AppShell
            banner={isDevelopmentNoticeShown ? <DevelopmentNotice /> : undefined}
            height="auto"
            mobileNav={false}
            topNav={
                <Stack>
                    <TopNav
                        className="min-h-11 px-7"
                        endContent={action}
                        heading={
                            breadcrumb ?? (
                                <Link href="/" label="LongLink home" color="inherit">
                                    <Wordmark />
                                </Link>
                            )
                        }
                        label="Platform navigation"
                    />
                    {tabs.length > 0 ? (
                        <Stack
                            className="overflow-y-hidden"
                            direction="horizontal"
                            isScrollable
                            paddingInline={4}
                            width="100%"
                        >
                            <TabList
                                aria-label="Section navigation"
                                onChange={() => undefined}
                                size="sm"
                                value={activeTab ?? findActiveTab(tabs, pathname) ?? ''}
                            >
                                {tabs.map((tab) => {
                                    const Icon = tab.icon;

                                    return (
                                        <Tab
                                            href={tab.href}
                                            icon={Icon ? <Icon aria-hidden="true" size={16} /> : undefined}
                                            key={tab.href}
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
            variant="wash"
        >
            <Stack
                className="relative"
                height={isContentCentered ? contentMinHeight : undefined}
                minHeight={contentMinHeight}
            >
                <Card
                    aria-hidden="true"
                    className="pointer-events-none absolute z-0 end-0 bottom-0 start-0 top-0 overflow-clip bg-body px-2 pb-2 pt-0"
                    padding={0}
                    variant="transparent"
                >
                    <Card className="border-0" height="100%" width="100%" />
                </Card>
                <Stack
                    align={isContentCentered ? 'center' : undefined}
                    className="relative z-10"
                    height={isContentCentered ? '100%' : undefined}
                    justify={isContentCentered ? 'center' : undefined}
                    padding={2}
                >
                    {children}
                </Stack>
            </Stack>
        </AppShell>
    );
}
