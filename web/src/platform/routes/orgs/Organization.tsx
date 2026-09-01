import { useParams } from 'react-router';
import { hasMinimumRole } from '@/lib/roles';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { proportional } from '@astryxdesign/core/Table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import NotFoundLayout from '@/components/layouts/NotFound';
import { PageContainer } from '@/components/PageContainer';
import { Table, TableColumn } from '@/components/ui/Table';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { PageError, PageLoading } from '@/components/Utils';
import CreateApplication from '@/components/dialogs/CreateApplication';
import { useOrganizationApplications } from '@/lib/hooks/use-organization';
import type { OrganizationApplicationSummary } from '@/lib/generated/platform-api-v1/types.gen';

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
        <PageContainer gap={8} padding={2}>
            <Stack direction="horizontal" justify="between" align="center" wrap="wrap">
                <Stack>
                    <Heading level={1}>Applications</Heading>
                    <Text as="p" color="secondary">
                        Manage the applications attached to this organization.
                    </Text>
                </Stack>
                {canManageApplications ? <CreateApplication organizationId={organizationId} /> : null}
            </Stack>
            <Table
                data={applications}
                density="compact"
                emptyState={<EmptyState title="No results." isCompact />}
                hasHover
                idKey="id"
            >
                <TableColumn<OrganizationApplicationSummary> field="name" header="Application" width={proportional(1)}>
                    {(application) => (
                        <Stack>
                            <Stack direction="horizontal" gap={1} align="center">
                                <Link href={`/orgs/${organization}/apps/${application.slug}`} weight="semibold">
                                    {application.name}
                                </Link>
                                <StatusBadge status={application.status} />
                            </Stack>
                            {application.description ? <Text type="supporting">{application.description}</Text> : null}
                        </Stack>
                    )}
                </TableColumn>
            </Table>
        </PageContainer>
    );
}
