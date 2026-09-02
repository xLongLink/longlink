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
import CreateSolution from '@/components/dialogs/CreateSolution';
import { useOrganizationSolutions } from '@/lib/hooks/use-organization';
import type { OrganizationSolutionSummary } from '@/lib/generated/platform-api-v1/types.gen';

/** Renders the organization solutions page. */
export default function Organization() {
    const { organization = '' } = useParams();
    const { solutions, organizationId, role, isLoading, error } = useOrganizationSolutions(organization);
    const canManageSolutions = hasMinimumRole(role, 'maintain');

    // Hide missing or inaccessible orgs behind the shared 404 page.
    if (error?.status === 404) {
        return <NotFoundLayout />;
    }

    if (isLoading && solutions.length === 0) {
        return <PageLoading label="Loading solutions" />;
    }

    if (error && solutions.length === 0) {
        return (
            <PageError
                description="We couldn't load the solutions for this organization."
                title="Unable to load solutions"
            />
        );
    }

    // Keep edge-aware content aligned within the centered page container.
    return (
        <PageContainer gap={8} padding={2}>
            <Stack direction="horizontal" justify="between" align="center" wrap="wrap">
                <Stack>
                    <Heading level={1}>Solutions</Heading>
                    <Text as="p" color="secondary">
                        Manage the solutions attached to this organization.
                    </Text>
                </Stack>
                {canManageSolutions ? <CreateSolution organizationId={organizationId} /> : null}
            </Stack>
            <Table
                data={solutions}
                density="compact"
                emptyState={<EmptyState title="No results." isCompact />}
                hasHover
                idKey="id"
            >
                <TableColumn<OrganizationSolutionSummary> field="name" header="Solution" width={proportional(1)}>
                    {(solution) => (
                        <Stack>
                            <Stack direction="horizontal" gap={1} align="center">
                                <Link href={`/orgs/${organization}/solutions/${solution.slug}`} weight="semibold">
                                    {solution.name}
                                </Link>
                                <StatusBadge status={solution.status} />
                            </Stack>
                            {solution.description ? <Text type="supporting">{solution.description}</Text> : null}
                        </Stack>
                    )}
                </TableColumn>
            </Table>
        </PageContainer>
    );
}
