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

export type NavigationTab = {
    href: string;
    icon?: LucideIcon;
    label: string;
};

type PlatformProps = {
    action: ReactNode;
    breadcrumb?: ReactNode;
    children: ReactNode;
    /** Lets compact application views use AppShell's header-aware scroll region. */
    height?: 'auto' | 'fill';
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
export default function Platform({ action, breadcrumb, children, height = 'auto', tabs }: PlatformProps) {
    const { pathname } = useLocation();

    // Keep route selection outside the presentation frame so previews need no account or router state.
    return (
        <PlatformFrame
            action={action}
            breadcrumb={breadcrumb}
            height={height}
            navigation={
                tabs.length > 0 ? (
                    <TabList
                        aria-label="Section navigation"
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
                ) : undefined
            }
        >
            {children}
        </PlatformFrame>
    );
}

/** Shares the actual Platform chrome and content frame without authentication or route-dependent navigation. */
export function PlatformFrame({
    action,
    breadcrumb,
    children,
    className,
    height = 'auto',
    navigation,
}: Omit<PlatformProps, 'tabs'> & { className?: string; navigation?: ReactNode }) {
    return (
        <AppShell
            className={className}
            height={height}
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
                    {navigation && (
                        <Stack direction="horizontal" paddingInline={4} width="100%">
                            {navigation}
                        </Stack>
                    )}
                </Stack>
            }
            variant="wash"
        >
            {/* Fill the available main region without adding another viewport-height budget. */}
            <Stack
                className="relative"
                height={height === 'fill' ? '100%' : undefined}
                minHeight={height === 'fill' ? 0 : 'calc(100dvh - var(--_app-shell-header-height, 0px))'}
            >
                <Card
                    aria-hidden="true"
                    className="pointer-events-none absolute z-0 inset-0 overflow-clip bg-body px-2 pb-2 pt-0"
                    padding={0}
                    variant="transparent"
                >
                    <Card className="border-0" height="100%" width="100%" />
                </Card>
                <Stack
                    className="relative z-10"
                    height={height === 'fill' ? '100%' : undefined}
                    minHeight={height === 'fill' ? 0 : undefined}
                    padding={2}
                >
                    {children}
                </Stack>
            </Stack>
        </AppShell>
    );
}
