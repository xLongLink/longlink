import type { ComponentProps } from 'react';
import { Stack } from '@/components/ui/Stack';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@astryxdesign/core/Badge';
import { Heading } from '@astryxdesign/core/Heading';
import { useUserProfile } from '@/lib/hooks/use-user';
import { proportional } from '@astryxdesign/core/Table';
import { PageContainer } from '@/components/PageContainer';
import { Table, TableColumn } from '@/components/ui/Table';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { PageError, PageLoading } from '@/components/Utils';
import CreateOrganization from '@/components/dialogs/CreateOrganization';
import type { Status, UserOrganizationMembership } from '@/lib/generated/platform-api-v1/types.gen';

const statusPresentation = {
    creating: { label: 'Creating', variant: 'info' },
    failed: { label: 'Failed', variant: 'error' },
    running: { label: 'Running', variant: 'neutral' },
} satisfies Record<Status, { label: string; variant: ComponentProps<typeof Badge>['variant'] }>;

/** Renders the organizations landing page for the authenticated user. */
export default function Organizations() {
    const { memberships, isOrganizationsLoading, organizationsError } = useUserProfile();

    if (memberships.length === 0 && isOrganizationsLoading) {
        return <PageLoading label="Loading organizations" />;
    }

    if (memberships.length === 0 && organizationsError) {
        return (
            <PageError
                description="We couldn't load the organizations available to your account."
                title="Unable to load organizations"
            />
        );
    }

    return (
        <PageContainer gap={8} padding={2}>
            <Stack direction="horizontal" justify="between" align="center" wrap="wrap">
                <Stack>
                    <Heading level={1}>Organizations</Heading>
                    <Text as="p" color="secondary">
                        Manage the workspaces connected to your LongLink account.
                    </Text>
                </Stack>
                <CreateOrganization />
            </Stack>
            <Table
                data={memberships}
                density="compact"
                emptyState={<EmptyState title="No results." isCompact />}
                hasHover
                idKey={(membership) => membership.organization.id}
            >
                <TableColumn<UserOrganizationMembership> field="name" header="Name" width={proportional(1)}>
                    {(membership) => (
                        <Stack direction="horizontal" gap={3} align="center">
                            <Avatar
                                kind="organization"
                                src={membership.organization.avatar || undefined}
                                name={membership.organization.name}
                                size="md"
                            />
                            <Stack>
                                <Stack direction="horizontal" gap={1} align="center">
                                    <Link href={`/orgs/${membership.organization.slug}`} weight="semibold">
                                        {membership.organization.name}
                                    </Link>
                                    {membership.organization.status === 'running' ? null : (
                                        <Badge {...statusPresentation[membership.organization.status]} />
                                    )}
                                </Stack>
                                <Text type="supporting">Organization</Text>
                            </Stack>
                        </Stack>
                    )}
                </TableColumn>
            </Table>
        </PageContainer>
    );
}
