import type { z } from 'zod';
import { useState } from 'react';
import { useParams } from 'react-router';
import { useApi } from '@/lib/hooks/use-api';
import CreateSolution from './CreateSolution';
import { NoIndex } from '@/components/NoIndex';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { Stack } from '@astryxdesign/core/Stack';
import { ExternalLink, Plus } from 'lucide-react';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Table, proportional } from '@astryxdesign/core/Table';
import type * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { useResolvedOrganizationMembership } from '@/lib/hooks/use-organization';

/** Lists an organization's Solutions; the layout owns organization-scoped state resets. */
export default function Organization() {
    const { organization = '' } = useParams();
    const [creating, setCreating] = useState(false);
    const membership = useResolvedOrganizationMembership();
    const organizationId = membership.organization.id;

    const [solutions, invalidateSolutions] = useApi<
        z.output<typeof schemas.zGetOrganizationSolutionsApiV1OrganizationsOrganizationIdSolutionsGetResponse>
    >(`/api/v1/organizations/${organizationId}/solutions`);

    const canCreate = ['maintain', 'admin', 'owner'].includes(membership.role);

    // Match the Organizations empty state within the existing Platform shell and padding.
    return (
        <>
            <NoIndex title="Organization Solutions | LongLink" />
            <Stack
                gap={solutions.length === 0 ? 8 : 4}
                justify={solutions.length === 0 ? 'center' : undefined}
                minHeight={
                    solutions.length === 0
                        ? 'calc(100dvh - var(--_app-shell-header-height, 0px) * 2 - var(--spacing-8))'
                        : undefined
                }
            >
                {solutions.length > 0 && (
                    <Stack direction="horizontal" justify="between" align="center" wrap="wrap" className="min-h-12">
                        <Heading level={1}>Solutions</Heading>
                        {canCreate && <Button label="New Solution" onClick={() => setCreating(true)} />}
                    </Stack>
                )}
                {solutions.length === 0 ? (
                    <Stack gap={6} align="center">
                        <img
                            src="/images/solution.png"
                            alt=""
                            className="size-20 object-contain"
                            width={272}
                            height={279}
                            decoding="async"
                        />
                        <Stack gap={0}>
                            <Heading level={1} justify="center">
                                Your Solutions
                            </Heading>
                            <Text as="p" color="secondary" justify="center">
                                Bring your business processes to life
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
                            {canCreate && (
                                <Button
                                    label="Create solution"
                                    variant="primary"
                                    icon={<Plus className="size-4" aria-hidden="true" />}
                                    onClick={() => setCreating(true)}
                                />
                            )}
                        </Stack>
                    </Stack>
                ) : (
                    <Table
                        data={solutions}
                        idKey="id"
                        hasHover
                        density="compact"
                        columns={[
                            {
                                key: 'name',
                                header: 'Solution',
                                width: proportional(1),
                                renderCell: (row) => (
                                    <Stack gap={0}>
                                        <Stack direction="horizontal" gap={1} align="center">
                                            <Link href={`/orgs/${organization}/solutions/${row.slug}`}>{row.name}</Link>
                                            {row.status !== 'running' && (
                                                <Badge
                                                    label={row.status === 'creating' ? 'Creating' : 'Failed'}
                                                    variant={row.status === 'creating' ? 'info' : 'error'}
                                                />
                                            )}
                                        </Stack>
                                        {row.description && <Text type="supporting">{row.description}</Text>}
                                    </Stack>
                                ),
                            },
                        ]}
                    />
                )}
                {creating && (
                    <CreateSolution
                        organizationId={organizationId}
                        invalidate={invalidateSolutions}
                        onClose={() => setCreating(false)}
                    />
                )}
            </Stack>
        </>
    );
}
