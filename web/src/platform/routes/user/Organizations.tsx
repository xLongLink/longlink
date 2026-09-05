import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { OrganizationCell } from '@/components/Cells';
import { proportional } from '@astryxdesign/core/Table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageContainer } from '@/components/PageContainer';
import { Table, TableColumn } from '@/components/ui/Table';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { PageError, PageLoading } from '@/components/Utils';
import { useUserOrganizations } from '@/lib/hooks/use-user';
import CreateOrganization from '@/components/dialogs/CreateOrganization';
import type { UserOrganizationMembership } from '@/lib/generated/platform-api-v1/types.gen';

/** Renders the organizations landing page for the authenticated user. */
export default function Organizations() {
    const { memberships, isOrganizationsLoading, organizationsError } = useUserOrganizations();

    if (isOrganizationsLoading) {
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
                        <OrganizationCell
                            endContent={<StatusBadge status={membership.organization.status} />}
                            organization={membership.organization}
                        />
                    )}
                </TableColumn>
            </Table>
        </PageContainer>
    );
}
