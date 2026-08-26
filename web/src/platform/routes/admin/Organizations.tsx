import { api } from '@/lib/api';
import { Badge } from '@astryxdesign/core/Badge';
import { useDeleteDialog } from '@/lib/utils';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/lib/hooks/use-toast';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { usePaginate } from '@/lib/hooks/pagination';
import { Heading } from '@astryxdesign/core/Heading';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Table, TableColumn } from '@/components/ui/Table';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { PageError, PageLoading } from '@/components/Utils';
import { pixel, proportional } from '@astryxdesign/core/Table';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';
import { zPageOrganizationSummary } from '@/lib/generated/platform-api-v1/zod.gen';
import type { OrganizationSummary, Status } from '@/lib/generated/platform-api-v1/types.gen';
import type { ComponentProps } from 'react';

const statusPresentation = {
    creating: { label: 'Creating', variant: 'info' },
    failed: { label: 'Failed', variant: 'error' },
    running: { label: 'Running', variant: 'neutral' },
} satisfies Record<Status, { label: string; variant: ComponentProps<typeof Badge>['variant'] }>;

/** Renders the admin organizations page. */
export default function AdminOrganizations() {
    const toast = useToast();
    const queryClient = useQueryClient();
    const deleteOrganization = useMutation({
        mutationFn: (organizationId: string) => api(`/api/v1/organizations/${organizationId}`, { method: 'DELETE' }),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['api', '/api/v1/organizations'] }),
                queryClient.invalidateQueries({ queryKey: ['api', '/api/v1/me/organizations'] }),
            ]);
            toast({ body: 'Organization deleted' });
        },
    });
    const {
        items: organizations,
        error,
        isLoading,
        pagination,
    } = usePaginate('/api/v1/organizations', zPageOrganizationSummary);
    const deleteDialog = useDeleteDialog({
        title: 'Delete organization',
        mutation: deleteOrganization,
        items: organizations,
        getId: (organization) => organization.id,
        description: (organization) => `Delete organization ${organization.name}?`,
        errorMessage: 'Failed to delete organization',
        fallbackDescription: 'Delete this organization?',
        onError: (message) => toast({ body: message, type: 'error' }),
    });

    if (isLoading && organizations.length === 0) {
        return <PageLoading label="Loading organizations" />;
    }

    if (error && organizations.length === 0) {
        return (
            <PageError
                description="We couldn't load the platform organizations."
                title="Unable to load organizations"
            />
        );
    }

    return (
        <VStack gap={6} width="100%">
            <VStack gap={0}>
                <Heading level={1}>Organizations</Heading>
                <Text as="p" color="secondary">
                    Review organization lifecycle, ownership, and access boundaries.
                </Text>
            </VStack>
            <Table
                data={organizations}
                density="compact"
                emptyState={<EmptyState title="No results." isCompact />}
                hasHover
                idKey="id"
                plugins={{ pagination }}
            >
                <TableColumn<OrganizationSummary> field="name" header="Name" width={proportional(1)}>
                    {(organization) => (
                        <HStack gap={3} align="center">
                            <Avatar kind="organization" src={organization.avatar} name={organization.name} />
                            <VStack gap={0} align="start">
                                <Badge {...statusPresentation[organization.status]} />
                                <Link href={`/orgs/${organization.slug}`} weight="semibold">
                                    {organization.name}
                                </Link>
                            </VStack>
                        </HStack>
                    )}
                </TableColumn>
                <TableColumn<OrganizationSummary> align="end" field="actions" header="Action" width={pixel(96)}>
                    {(organization) => (
                        <MoreMenu
                            label={`Open actions for ${organization.name}`}
                            size="sm"
                            items={[{ label: 'Delete', onClick: () => deleteDialog.openFor(organization) }]}
                        />
                    )}
                </TableColumn>
            </Table>
            <DeleteConfirmation {...deleteDialog.dialogProps} />
        </VStack>
    );
}
