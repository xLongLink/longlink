import type { ReactNode } from 'react';
import startCase from 'lodash/startCase';
import { useLocation } from 'react-router';
import { Card } from '@astryxdesign/core/Card';
import { Link } from '@astryxdesign/core/Link';
import { Stack } from '@astryxdesign/core/Stack';
import { TopNav } from '@astryxdesign/core/TopNav';
import { AppShell } from '@astryxdesign/core/AppShell';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { findActiveTab } from '@/lib/paths';
import { getIconComponent } from '@/lib/icons';
import { Wordmark } from '@/components/Wordmark';
import { PageContainer } from '@/components/PageContainer';
import { DevelopmentNotice } from '@/components/DevelopmentNotice';
import { pageRouteIsDynamic, type RuntimePage } from '@/platform/pages';

type ApplicationLayoutProps = {
    basePath: string;
    children: ReactNode;
    pages: readonly RuntimePage[];
};

/** Builds an application runtime href for one page route. */
export function applicationHref(route: string, basePath: string): string {
    const normalizedBasePath = basePath === '/' ? '' : basePath;

    return route ? `${normalizedBasePath}/${route}` : normalizedBasePath || '/';
}

/** Renders application content with navigation derived from the runtime page manifest. */
export function ApplicationLayout({ basePath, children, pages }: ApplicationLayoutProps) {
    const { pathname } = useLocation();
    const tabGroups = new Map<string, { href: string; icon?: ReturnType<typeof getIconComponent>; label: string }>();

    // Build one static navigation target per runtime tab.
    for (const page of pages) {
        if (!page.route || pageRouteIsDynamic(page.route) || tabGroups.has(page.tab)) {
            continue;
        }

        tabGroups.set(page.tab, {
            href: applicationHref(page.route, basePath),
            icon: page.icon ? getIconComponent(page.icon) : undefined,
            label: page.name || startCase(page.tab),
        });
    }

    const tabs = [...tabGroups.values()];
    const activeTab = findActiveTab(tabs, pathname);

    return (
        <AppShell
            banner={<DevelopmentNotice />}
            className="platform-top-layout"
            contentPadding={0}
            height="auto"
            mobileNav={false}
            topNav={
                <Stack gap={0}>
                    <TopNav
                        className="px-7"
                        endContent={
                            <Link as="a" href="https://longlink.dev/docs" isExternalLink isStandalone>
                                Documentation
                            </Link>
                        }
                        heading={
                            <Link
                                as="a"
                                href="https://longlink.dev"
                                label="LongLink home"
                                color="inherit"
                                rel="noopener noreferrer"
                                target="_blank"
                            >
                                <Wordmark />
                            </Link>
                        }
                        label="Main navigation"
                    />
                    {tabs.length > 0 ? (
                        <Stack direction="horizontal" isScrollable paddingInline={4} width="100%">
                            <TabList
                                aria-label="Section navigation"
                                hasDivider
                                onChange={() => undefined}
                                size="sm"
                                value={activeTab ?? ''}
                            >
                                {tabs.map((tab) => {
                                    const TabIcon = tab.icon;

                                    return (
                                        <Tab
                                            key={tab.label}
                                            href={tab.href}
                                            icon={TabIcon ? <TabIcon aria-hidden="true" size={16} /> : undefined}
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
                <PageContainer minHeight="100%">{children}</PageContainer>
            </Stack>
        </AppShell>
    );
}
