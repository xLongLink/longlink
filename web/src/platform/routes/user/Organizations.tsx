import type { z } from 'zod';
import { useState } from 'react';
import { NoIndex } from '@/components/Seo';
import { useApi } from '@/lib/hooks/use-api';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Stack } from '@astryxdesign/core/Stack';
import { ExternalLink, Plus } from 'lucide-react';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import CreateOrganization from './CreateOrganization';
import { ApiBoundary } from '@/components/ApiBoundary';
import { PageContainer } from '@/components/PageContainer';
import { Table, proportional } from '@astryxdesign/core/Table';
import type * as schemas from '@/lib/generated/platform-api-v1/zod.gen';

/** Lists the current user's organizations and creates new organizations. */
export default function Organizations() {
    // Keep the page inside the existing Platform shell and request boundary.
    return (
        <PageContainer padding={2}>
            <NoIndex title="Organizations | LongLink" />
            <ApiBoundary>
                <OrganizationList />
            </ApiBoundary>
        </PageContainer>
    );
}

/** Renders the organization's list while its boundary owns request lifecycle state. */
function OrganizationList() {
    const [creating, setCreating] = useState(false);
    const [memberships, invalidate] =
        useApi<z.output<typeof schemas.zGetMyOrganizationsApiV1MeOrganizationsGetResponse>>('/api/v1/me/organizations');

    // Offset the navigation and both padding layers so the empty state centers in the full viewport.
    return (
        <>
            <Stack
                gap={memberships.length === 0 ? 8 : 4}
                justify={memberships.length === 0 ? 'center' : undefined}
                minHeight={
                    memberships.length === 0
                        ? 'calc(100dvh - var(--_app-shell-header-height, 0px) * 2 - var(--spacing-8))'
                        : undefined
                }
            >
                {memberships.length > 0 && (
                    <Stack direction="horizontal" justify="between" align="center" wrap="wrap" className="min-h-12">
                        <Heading level={1}>Organizations</Heading>
                        <Button label="Create Organization" onClick={() => setCreating(true)} />
                    </Stack>
                )}
                {memberships.length === 0 ? (
                    <Stack gap={6} align="center">
                        <img
                            src="/images/organization.png"
                            alt=""
                            className="size-20 object-contain"
                            width={1254}
                            height={1254}
                            decoding="async"
                        />
                        <Stack gap={0}>
                            <Heading level={1} justify="center">
                                Your Organizations
                            </Heading>
                            <Text as="p" color="secondary" justify="center">
                                A place for your workflows and data
                            </Text>
                        </Stack>
                        <Stack direction="horizontal" gap={3} justify="center" wrap="wrap">
                            <Button
                                label="Read the docs"
                                variant="secondary"
                                href="/docs/"
                                target="_blank"
                                rel="noopener noreferrer"
                                endContent={<ExternalLink className="size-4" aria-hidden="true" />}
                            />
                            <Button
                                label="Create organization"
                                variant="primary"
                                icon={<Plus className="size-4" aria-hidden="true" />}
                                onClick={() => setCreating(true)}
                            />
                        </Stack>
                    </Stack>
                ) : (
                    <Table
                        data={memberships}
                        idKey={(row) => row.organization.id}
                        hasHover
                        density="compact"
                        columns={[
                            {
                                key: 'organization',
                                header: 'Name',
                                width: proportional(1),
                                renderCell: (row) => (
                                    <Stack direction="horizontal" gap={3} align="center">
                                        <Avatar shape="rounded" name={row.organization.name} />
                                        <Stack align="start" gap={0}>
                                            <Link href={`/orgs/${row.organization.slug}`}>{row.organization.name}</Link>
                                            <Text type="supporting">Organization</Text>
                                        </Stack>
                                    </Stack>
                                ),
                            },
                        ]}
                    />
                )}
            </Stack>
            <CreateOrganization isOpen={creating} onOpenChange={setCreating} invalidate={invalidate} />
        </>
    );
}
