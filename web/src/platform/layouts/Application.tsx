import startCase from 'lodash/startCase';
import { Link } from '@astryxdesign/core/Link';
import { Stack } from '@astryxdesign/core/Stack';
import { TopNav } from '@astryxdesign/core/TopNav';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import type { ReactNode } from 'react';
import { generatePath, useLocation } from 'react-router';
import { Wordmark } from '@/components/Wordmark';
import { PageContainer } from '@/components/PageContainer';
import Platform from '@/components/layouts/Platform';
import { getIconComponent } from '@/lib/icons';
import { normalizePathname } from '@/lib/paths';

/** Builds an application-shell href for one runtime page route. */
export function applicationHref(route: string, organization?: string, application?: string): string {
    const basePath =
        application && organization
            ? generatePath('/orgs/:organization/apps/:application', { organization, application })
            : organization
              ? generatePath('/orgs/:organization', { organization })
              : '';

    return route ? `${basePath}/${route}` : basePath || '/';
}

/** Renders application content with navigation derived from the runtime page manifest. */
export function ApplicationLayout({
    application,
    children,
    organization,
    pages,
}: {
    application?: string;
    children: ReactNode;
    organization?: string;
    pages: readonly { icon?: string; name?: string; route: string; tab: string }[];
}) {
    const { pathname } = useLocation();
    const tabGroups = new Map<string, { href: string; icon?: ReturnType<typeof getIconComponent>; label: string }>();

    // Build one static navigation target per runtime tab.
    for (const page of pages) {
        if (!page.route || /(?:^|\/):/.test(page.route) || tabGroups.has(page.tab)) {
            continue;
        }

        tabGroups.set(page.tab, {
            href: applicationHref(page.route, organization, application),
            icon: page.icon ? getIconComponent(page.icon) : undefined,
            label: page.name || startCase(page.tab),
        });
    }

    const tabs = [...tabGroups.values()];
    const normalizedPathname = normalizePathname(pathname);
    const activeTab = tabs.reduce<string | undefined>((best, tab) => {
        const tabPathname = normalizePathname(tab.href);
        if (tabPathname !== normalizedPathname && !normalizedPathname.startsWith(`${tabPathname}/`)) {
            return best;
        }

        return best === undefined || tabPathname.length > best.length ? tabPathname : best;
    }, undefined);

    return (
        <Platform
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
        >
            <PageContainer minHeight="100%">{children}</PageContainer>
        </Platform>
    );
}
