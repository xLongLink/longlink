import type { ComponentProps } from 'react';
import { useParams } from 'react-router';
import { hasMinimumRole } from '@/lib/roles';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Heading } from '@astryxdesign/core/Heading';
import { proportional } from '@astryxdesign/core/Table';
import NotFoundLayout from '@/components/layouts/NotFound';
import { PageContainer } from '@/components/PageContainer';
import { Table, TableColumn } from '@/components/ui/Table';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { PageError, PageLoading } from '@/components/Utils';
import CreateApplication from '@/components/dialogs/CreateApplication';
import { useOrganizationApplications } from '@/lib/hooks/use-organization';
import type { OrganizationApplicationSummary, Status } from '@/lib/generated/platform-api-v1/types.gen';

const statusPresentation = {
    creating: { label: 'Creating', variant: 'info' },
    running: { label: 'Running', variant: 'neutral' },
} satisfies Record<Status, { label: string; variant: ComponentProps<typeof Badge>['variant'] }>;

/** Renders the organization applications page. */
export default function Organization() {
    const { organization = '' } = useParams();
    const { applications, organizationId, role, isLoading, error } = useOrganizationApplications(organization);
    const canManageApplications = hasMinimumRole(role, 'maintain');

    // Hide missing or inaccessible orgs behind the shared 404 page.
    if (error?.status === 404) {
        return <NotFoundLayout />;
    }

    if (isLoading && applications.length === 0) {
        return <PageLoading label="Loading applications" />;
    }

    if (error && applications.length === 0) {
        return (
            <PageError
                description="We couldn't load the applications for this organization."
                title="Unable to load applications"
            />
        );
    }

    // Keep edge-aware content aligned within the centered page container.
    return (
        <PageContainer gap={8}>
            <HStack gap={0} justify="between" align="center" wrap="wrap">
                <VStack gap={0}>
                    <Heading level={1}>Applications</Heading>
                    <Text as="p" color="secondary">
                        Manage the applications attached to this organization.
                    </Text>
                </VStack>
                {canManageApplications ? <CreateApplication organizationId={organizationId} /> : null}
            </HStack>
            <Table
                data={applications}
                density="compact"
                emptyState={<EmptyState title="No results." isCompact />}
                hasHover
                idKey="id"
            >
                <TableColumn<OrganizationApplicationSummary> field="name" header="Application" width={proportional(1)}>
                    {(application) => (
                        <VStack gap={1}>
                            <HStack gap={1} align="center">
                                <Link href={`/orgs/${organization}/apps/${application.slug}`} weight="semibold">
                                    {application.name}
                                </Link>
                                <Badge {...statusPresentation[application.status]} />
                            </HStack>
                            {application.description ? <Text type="supporting">{application.description}</Text> : null}
                        </VStack>
                    )}
                </TableColumn>
            </Table>
        </PageContainer>
    );
}
