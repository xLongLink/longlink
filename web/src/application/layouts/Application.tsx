import type { ReactNode } from 'react';
import startCase from 'lodash/startCase';
import { Link } from '@astryxdesign/core/Link';
import { Stack } from '@astryxdesign/core/Stack';
import { useQuery } from '@tanstack/react-query';
import { TopNav } from '@astryxdesign/core/TopNav';
import { api } from '@/lib/api';
import { Wordmark } from '@/components/Wordmark';
import { Navigation } from '@/components/Navigation';
import TopLayout from '@/components/layouts/TopLayout';
import { getIconComponent } from '@/components/ui/Icon';
import { PageContainer } from '@/components/PageContainer';
import { pageRouteIsDynamic, pageSchema, type RuntimePage } from '@/xml/pages';

export type ApplicationRuntime = {
    error: Error | null;
    pagesUrl: string;
    registeredPages: RuntimePage[] | undefined;
};

/** Renders the application shell and manifest-derived navigation. */
export default function ApplicationLayout({
    children,
    pagesUrl,
}: {
    children: (runtime: ApplicationRuntime) => ReactNode;
    pagesUrl: string;
}) {
    const { data: registeredPages, error } = useQuery({
        queryKey: ['api', pagesUrl],
        queryFn: async ({ signal }) => pageSchema.array().parse(await api(pagesUrl, { signal }).json()),
    });
    const tabGroups = new Map<string, { href: string; icon?: ReturnType<typeof getIconComponent>; label: string }>();

    // Build one static navigation target per runtime tab.
    for (const page of registeredPages ?? []) {
        if (!page.route || pageRouteIsDynamic(page.route) || tabGroups.has(page.tab)) {
            continue;
        }

        tabGroups.set(page.tab, {
            href: `/${page.route}`,
            icon: page.icon ? getIconComponent(page.icon) : undefined,
            label: page.name || startCase(page.tab),
        });
    }

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
                    {tabGroups.size > 0 ? <Navigation tabs={[...tabGroups.values()]} /> : null}
                </Stack>
            }
        >
            <PageContainer minHeight="100%">{children({ error, pagesUrl, registeredPages })}</PageContainer>
        </TopLayout>
    );
}
