import { NoIndex } from '@/components/Seo';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { OrganizationCell } from '@/components/Cells';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageContainer } from '@/components/PageContainer';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { PageError, PageLoading } from '@/components/Utils';
import { useUserOrganizations } from '@/lib/hooks/use-user';
import CreateOrganization from '@/components/dialogs/CreateOrganization';
import { Table, type TableColumn, proportional } from '@astryxdesign/core/Table';
import type { UserOrganizationMembership } from '@/lib/generated/platform-api-v1/types.gen';

/** Renders the organizations landing page for the authenticated user. */
export default function Organizations() {
    const {
        data: memberships = [],
        isLoading: isOrganizationsLoading,
        error: organizationsError,
    } = useUserOrganizations();
    const pageMetadata = <NoIndex title="Organizations | LongLink" />;

    if (isOrganizationsLoading) {
        return (
            <>
                {pageMetadata}
                <PageLoading label="Loading organizations" />
            </>
        );
    }

    if (memberships.length === 0 && organizationsError) {
        return (
            <>
                {pageMetadata}
                <PageError
                    description="We couldn't load the organizations available to your account."
                    title="Unable to load organizations"
                />
            </>
        );
    }

    return (
        <PageContainer gap={8} padding={2}>
            {pageMetadata}
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
                columns={
                    [
                        {
                            key: 'name',
                            header: 'Name',
                            width: proportional(1),
                            renderCell: (membership) => (
                                <OrganizationCell
                                    endContent={<StatusBadge status={membership.organization.status} />}
                                    organization={membership.organization}
                                />
                            ),
                        },
                    ] satisfies TableColumn<UserOrganizationMembership>[]
                }
            />
        </PageContainer>
    );
}
