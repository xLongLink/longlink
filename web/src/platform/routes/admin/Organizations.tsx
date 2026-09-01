import { api } from '@/lib/api';
import { useState } from 'react';
import { Ellipsis } from 'lucide-react';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/lib/hooks/use-toast';
import { Stack } from '@astryxdesign/core/Stack';
import { usePaginate } from '@/lib/hooks/pagination';
import { Heading } from '@astryxdesign/core/Heading';
import { StatusBadge } from '@/components/ui/StatusBadge';
import MetadataDialog from '@/components/dialogs/Metadata';
import { Table, TableColumn } from '@/components/ui/Table';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { IconButton } from '@astryxdesign/core/IconButton';
import { PageError, PageLoading } from '@/components/Utils';
import { pixel, proportional } from '@astryxdesign/core/Table';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { zPageOrganizationSummary } from '@/lib/generated/platform-api-v1/zod.gen';
import type { OrganizationSummary } from '@/lib/generated/platform-api-v1/types.gen';
import { DeleteConfirmation, useDeleteDialog } from '@/components/dialogs/DeleteConfirmation';

/** Renders the admin organizations page. */
export default function AdminOrganizations() {
    const [metadataOrganization, setMetadataOrganization] = useState<OrganizationSummary | null>(null);
    const toast = useToast();
    const queryClient = useQueryClient();
    const closeMetadataOrganization = () => setMetadataOrganization(null);
    const deleteOrganization = useMutation({
        mutationFn: (organizationId: string) => api(`/api/v1/organizations/${organizationId}`, { method: 'DELETE' }),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['api', '/api/v1/organizations'] }),
                queryClient.invalidateQueries({ queryKey: ['api', '/api/v1/me/organizations'] }),
                queryClient.invalidateQueries({ queryKey: ['api', '/api/v1/organizations/slug'] }),
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

    if (isLoading) {
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
        <Stack gap={8}>
            <Stack>
                <Heading level={1}>Organizations</Heading>
                <Text as="p" color="secondary">
                    Review organization lifecycle, ownership, and access boundaries.
                </Text>
            </Stack>
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
                        <Stack direction="horizontal" gap={3} align="center">
                            <Avatar kind="organization" src={organization.avatar} name={organization.name} />
                            <Stack align="start">
                                <Stack direction="horizontal" gap={1} align="center">
                                    <Link href={`/orgs/${organization.slug}`} weight="semibold">
                                        {organization.name}
                                    </Link>
                                    <StatusBadge status={organization.status} />
                                </Stack>
                                <Text type="supporting">Organization</Text>
                            </Stack>
                        </Stack>
                    )}
                </TableColumn>
                <TableColumn<OrganizationSummary> align="end" field="metadata" header="" width={pixel(56)}>
                    {(organization) => (
                        <IconButton
                            icon={<Ellipsis />}
                            label={`View metadata for ${organization.name}`}
                            size="sm"
                            tooltip="View metadata"
                            variant="ghost"
                            onClick={() => setMetadataOrganization(organization)}
                        />
                    )}
                </TableColumn>
            </Table>
            {metadataOrganization && (
                <MetadataDialog
                    onClose={closeMetadataOrganization}
                    onDelete={() => deleteDialog.openFor(metadataOrganization)}
                    title="Organization metadata"
                >
                    <MetadataList>
                        <MetadataListItem label="Status">
                            <StatusBadge status={metadataOrganization.status} />
                        </MetadataListItem>
                        <MetadataListItem label="Slug">{metadataOrganization.slug}</MetadataListItem>
                        <MetadataListItem label="ID">{metadataOrganization.id}</MetadataListItem>
                    </MetadataList>
                </MetadataDialog>
            )}
            <DeleteConfirmation {...deleteDialog.dialogProps} />
        </Stack>
    );
}
