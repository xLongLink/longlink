import { useState } from 'react';
import { useApi } from '@/lib/hooks/use-api';
import CreateSolution from './CreateSolution';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { Stack } from '@astryxdesign/core/Stack';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Spinner } from '@astryxdesign/core/Spinner';
import { Table, proportional } from '@astryxdesign/core/Table';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { useOrganizationMembership } from '@/lib/hooks/use-organization';

/** Lists an organization's Solutions and permits authorized creation.
 * @param {{ organization: string }} props
 */
export default function Organization({ organization }) {
    const [creating, setCreating] = useState(false);
    const membership = useOrganizationMembership(organization);
    const organizationId = membership.data?.organization.id;
    const solutions = useApi(
        organizationId ? `/api/v1/organizations/${organizationId}/solutions` : null,
        schemas.zGetOrganizationSolutionsApiV1OrganizationsOrganizationIdSolutionsGetResponse
    );

    // Wait for membership before loading its dependent Solutions.
    if (membership.error || solutions.error) return <Banner status="error" title="Unable to load solutions" />;
    if (!membership.data || !solutions.data) return <Spinner label="Loading solutions" />;

    return (
        <Stack gap={8}>
            <Stack direction="horizontal" justify="between" align="center" wrap="wrap">
                <Heading level={1}>Solutions</Heading>
                {['maintain', 'admin', 'owner'].includes(membership.data.role) && (
                    <Button label="New Solution" onClick={() => setCreating(true)} />
                )}
            </Stack>
            <Table
                data={solutions.data}
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
                <CreateSolution organizationId={membership.data.organization.id} onClose={() => setCreating(false)} />
            )}
        </Stack>
    );
}
