import { useState } from 'react';
import { NoIndex } from '@/components/Seo';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { ApiBoundary } from '@/components/ApiBoundary';
import { useApi, useAction } from '@/lib/hooks/use-api';
import { PageContainer } from '@/components/PageContainer';
import { Table, proportional } from '@astryxdesign/core/Table';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import CreateOrganization from '@/platform/views/user/CreateOrganization';

/** Lists the current user's organizations and creates new organizations. */
export default function Organizations() {
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
    const action = useAction();
    const [memberships, invalidate] = useApi(
        '/api/v1/me/organizations',
        schemas.zGetMyOrganizationsApiV1MeOrganizationsGetResponse
    );

    return (
        <>
            <Stack gap={8}>
                <Stack direction="horizontal" justify="between" align="center" wrap="wrap">
                    <Heading level={1}>Organizations</Heading>
                    <Button label="Create Organization" onClick={() => setCreating(true)} />
                </Stack>
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
            </Stack>
            <CreateOrganization isOpen={creating} onOpenChange={setCreating} action={action} invalidate={invalidate} />
        </>
    );
}
