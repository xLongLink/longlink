import { Link } from '@astryxdesign/core/Link';
import { Wordmark } from '@/components/Wordmark';
import { Stack } from '@astryxdesign/core/Stack';
import Content from '@/components/layouts/Content';
import { TopNav } from '@astryxdesign/core/TopNav';
import { AppShell } from '@astryxdesign/core/AppShell';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import type { NavigationLayoutProps } from '@/components/layouts/types';

/** Renders horizontal application navigation without sidebar-specific state. */
export default function Topbar({
    action,
    activeTab,
    breadcrumb,
    children,
    homeHref = '/',
    tabs,
    topbarHeading,
}: NavigationLayoutProps) {
    return (
        <AppShell
            height="auto"
            mobileNav={false}
            topNav={
                <Stack>
                    <TopNav
                        className="min-h-11 px-7"
                        endContent={action}
                        heading={
                            topbarHeading ??
                            breadcrumb ?? (
                                <Link href={homeHref} label="LongLink home" color="inherit">
                                    <Wordmark />
                                </Link>
                            )
                        }
                        label="Platform navigation"
                    />
                    {tabs.length > 0 && (
                        <Stack direction="horizontal" paddingInline={4} width="100%">
                            <TabList
                                aria-label="Section navigation"
                                onChange={() => undefined}
                                size="sm"
                                value={activeTab}
                            >
                                {tabs.map((tab) => (
                                    <Tab
                                        href={tab.href}
                                        icon={tab.icon}
                                        key={tab.href}
                                        label={tab.label}
                                        value={tab.href}
                                    />
                                ))}
                            </TabList>
                        </Stack>
                    )}
                </Stack>
            }
            variant="wash"
        >
            <Content>{children}</Content>
        </AppShell>
    );
}
