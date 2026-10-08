import type { z } from 'zod';
import { ApiError } from '@/lib/api';
import { NoIndex } from '@/components/Seo';
import { useApi } from '@/lib/hooks/use-api';
import { Grid } from '@astryxdesign/core/Grid';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Outlet, useParams } from 'react-router';
import { ProfileMenu } from '@/components/Profile';
import Platform from '@/platform/layouts/Platform';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { ApiBoundary } from '@/components/ApiBoundary';
import { PageContainer } from '@/components/PageContainer';
import { PageError, PageLoading } from '@/components/Utils';
import { useAuthenticatedUser } from '@/lib/hooks/use-user';
import { PageBreadcrumb } from '@/components/breadcrumb/Page';
import { AppWindow, ExternalLink, House, Settings2 } from 'lucide-react';
import { OrganizationMembershipContext } from '@/lib/hooks/use-organization';
import type { zUserOrganizationMembership } from '@/lib/generated/platform-api-v1/zod.gen';

/** Renders the fixed navigation around organization pages. */
export default function OrganizationLayout() {
    const user = useAuthenticatedUser();

    return (
        <ApiBoundary
            fallback={
                <Platform action={<ProfileMenu user={user} />} breadcrumb={<PageBreadcrumb />} tabs={[]}>
                    <PageContainer gap={8} padding={2}>
                        <PageLoading label="Loading organization" />
                    </PageContainer>
                </Platform>
            }
            fallbackRender={({ error }) => (
                <Platform action={<ProfileMenu user={user} />} breadcrumb={<PageBreadcrumb />} tabs={[]}>
                    <PageContainer gap={8} padding={2}>
                        {error instanceof ApiError && error.status === 404 ? (
                            <>
                                <NoIndex title="Page Not Found | LongLink" />
                                <Stack
                                    gap={6}
                                    align="center"
                                    justify="center"
                                    minHeight="calc(100dvh - var(--_app-shell-header-height, 0px) * 2 - var(--spacing-8))"
                                >
                                    <img
                                        src="/images/missing.png"
                                        alt=""
                                        className="size-20 object-contain"
                                        width={1254}
                                        height={1254}
                                        decoding="async"
                                    />
                                    <Stack gap={0}>
                                        <Heading level={1} justify="center">
                                            Page not found
                                        </Heading>
                                        <Text as="p" color="secondary" justify="center">
                                            This page doesn't exist or isn't available
                                        </Text>
                                    </Stack>
                                    <Grid columns={2} gap={3}>
                                        <Button
                                            label="Read the docs"
                                            width="100%"
                                            variant="secondary"
                                            href="/docs/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            endContent={<ExternalLink className="size-4" aria-hidden="true" />}
                                        />
                                        <Button
                                            label="Go Home"
                                            width="100%"
                                            variant="primary"
                                            icon={<House className="size-4" aria-hidden="true" />}
                                            href="/"
                                        />
                                    </Grid>
                                </Stack>
                            </>
                        ) : (
                            <PageError
                                description="We couldn't load this organization."
                                title="Unable to load organization"
                            />
                        )}
                    </PageContainer>
                </Platform>
            )}
        >
            <OrganizationPage />
        </ApiBoundary>
    );
}

/** Resolves membership before mounting organization-dependent pages. */
function OrganizationPage() {
    const { organization = '' } = useParams();
    const user = useAuthenticatedUser();

    const [membership] = useApi<z.output<typeof zUserOrganizationMembership>>(
        `/api/v1/organizations/slug/${encodeURIComponent(organization)}`
    );

    return (
        <Platform
            action={<ProfileMenu user={user} />}
            breadcrumb={<PageBreadcrumb />}
            tabs={[
                { href: `/orgs/${organization}`, icon: AppWindow, label: 'Solutions' },
                { href: `/orgs/${organization}/settings`, icon: Settings2, label: 'Settings' },
            ]}
        >
            <PageContainer gap={8} padding={2}>
                <OrganizationMembershipContext value={membership}>
                    <ApiBoundary>
                        <Outlet key={organization} />
                    </ApiBoundary>
                </OrganizationMembershipContext>
            </PageContainer>
        </Platform>
    );
}
