import type { ReactNode } from 'react';
import { AppShell } from '@astryxdesign/core/AppShell';
import { Card } from '@astryxdesign/core/Card';
import { Link } from '@astryxdesign/core/Link';
import { Stack } from '@astryxdesign/core/Stack';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { TopNav } from '@astryxdesign/core/TopNav';
import type { LucideIcon } from 'lucide-react';
import { useLocation } from 'react-router';
import { DevelopmentNotice } from '@/components/DevelopmentNotice';
import { Wordmark } from '@/components/Wordmark';

type NavigationTab = {
    href: string;
    icon?: LucideIcon;
    label: string;
};

type PlatformProps = {
    action: ReactNode;
    breadcrumb: ReactNode;
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
export default function Platform({ action, breadcrumb, children, tabs }: PlatformProps) {
    const { pathname } = useLocation();

    return (
        <AppShell
            banner={import.meta.env.MODE === 'sdk' ? undefined : <DevelopmentNotice />}
            className="platform-top-layout"
            contentPadding={0}
            height="auto"
            mobileNav={false}
            topNav={
                <Stack>
                    <TopNav
                        endContent={action}
                        heading={
                            <Link href="/" label="LongLink home" color="inherit">
                                <Wordmark />
                            </Link>
                        }
                        label="Platform navigation"
                        startContent={breadcrumb}
                    />
                    <Stack direction="horizontal" isScrollable paddingInline={4} width="100%">
                        <TabList
                            aria-label="Section navigation"
                            hasDivider
                            onChange={() => undefined}
                            size="sm"
                            value={findActiveTab(tabs, pathname) ?? ''}
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
                </Stack>
            }
            variant="wash"
        >
            <Card
                aria-hidden="true"
                className="pointer-events-none fixed z-0 end-0 bottom-0 start-0 top-0 overflow-clip"
                padding={0}
                variant="transparent"
            >
                <Stack height="100%" padding={2}>
                    <Card className="border-0 overflow-clip" height="100%" width="100%" />
                </Stack>
            </Card>
            <Card
                aria-hidden="true"
                className="pointer-events-none fixed z-30 end-0 bottom-0 start-0 top-0 border-8 border-body bg-transparent"
                padding={0}
                variant="transparent"
            />
            <Stack className="relative z-10" minHeight="calc(100dvh - var(--appshell-header-height, 0px))" padding={2}>
                {children}
            </Stack>
        </AppShell>
    );
}
