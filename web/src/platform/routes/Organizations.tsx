import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@astryxdesign/core/Avatar';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Heading } from '@astryxdesign/core/Heading';
import { proportional } from '@astryxdesign/core/Table';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import type { UserOrganizationMembership } from '@/lib/generated/platform-api-v1/types.gen';
import { useUserProfile } from '@/lib/hooks/use-user';
import { PageContainer } from '@/components/PageContainer';
import { Table, TableColumn } from '@/components/ui/Table';
import { PageError, PageLoading } from '@/components/Utils';
import CreateOrganization from '@/components/dialogs/CreateOrganization';

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
        <PageContainer gap={8}>
            <HStack gap={4} justify="between" align="end" wrap="wrap">
                <VStack gap={1}>
                    <Heading level={1}>Organizations</Heading>
                    <Text type="supporting">Manage the workspaces connected to your LongLink account.</Text>
                </VStack>
                <CreateOrganization />
            </HStack>
            <Table
                data={memberships}
                density="compact"
                emptyState={<EmptyState title="No results." isCompact />}
                hasHover
                idKey={(membership) => membership.organization.id}
            >
                <TableColumn<UserOrganizationMembership> field="name" header="Name" width={proportional(1)}>
                    {(membership) => (
                        <HStack gap={3} align="center">
                            <Avatar
                                src={membership.organization.avatar || undefined}
                                name={membership.organization.name}
                                size="md"
                            />
                            <Link href={`/orgs/${membership.organization.slug}`} weight="semibold">
                                {membership.organization.name}
                            </Link>
                        </HStack>
                    )}
                </TableColumn>
            </Table>
        </PageContainer>
    );
}
