import { useState } from 'react';
import { useParams } from 'react-router';
import { NoIndex } from '@/components/Seo';
import { useApi } from '@/lib/hooks/use-api';
import CreateSolution from './CreateSolution';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Table, proportional } from '@astryxdesign/core/Table';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { useResolvedOrganizationMembership } from '@/lib/hooks/use-organization';

/** Lists an organization's Solutions; the layout owns organization-scoped state resets. */
export default function Organization() {
    const { organization = '' } = useParams();
    const [creating, setCreating] = useState(false);
    const membership = useResolvedOrganizationMembership();
    const organizationId = membership.organization.id;
    const [solutions, invalidateSolutions] = useApi(
        `/api/v1/organizations/${organizationId}/solutions`,
        schemas.zGetOrganizationSolutionsApiV1OrganizationsOrganizationIdSolutionsGetResponse
    );

    return (
        <>
            <NoIndex title="Organization Solutions | LongLink" />
            <Stack gap={8}>
                <Stack direction="horizontal" justify="between" align="center" wrap="wrap">
                    <Heading level={1}>Solutions</Heading>
                    {['maintain', 'admin', 'owner'].includes(membership.role) && (
                        <Button label="New Solution" onClick={() => setCreating(true)} />
                    )}
                </Stack>
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
