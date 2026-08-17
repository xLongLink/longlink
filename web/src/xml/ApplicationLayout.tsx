import type { ReactNode } from 'react';
import startCase from 'lodash/startCase';
import { Link } from '@astryxdesign/core/Link';
import { Stack } from '@astryxdesign/core/Stack';
import { TopNav } from '@astryxdesign/core/TopNav';
import { Wordmark } from '@/components/Wordmark';
import { Navigation } from '@/components/Navigation';
import TopLayout from '@/components/layouts/TopLayout';
import { getIconComponent } from '@/components/ui/Icon';
import { PageContainer } from '@/components/PageContainer';
import { pageRouteIsDynamic, type RuntimePage } from './pages';

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
    return (
        <TopLayout
            topMenu={
                <Stack>
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
                    {tabs.length > 0 ? <Navigation tabs={tabs} /> : null}
                </Stack>
            }
        >
            <PageContainer minHeight="100%">{children}</PageContainer>
        </TopLayout>
    );
}
