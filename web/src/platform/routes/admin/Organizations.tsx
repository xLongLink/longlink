import { useState } from 'react';
import { Ellipsis } from 'lucide-react';
import { NoIndex } from '@/components/Seo';
import { Text } from '@astryxdesign/core/Text';
import { useToast } from '@/lib/hooks/use-toast';
import { Stack } from '@astryxdesign/core/Stack';
import { usePaginate } from '@/lib/hooks/pagination';
import { Heading } from '@astryxdesign/core/Heading';
import { OrganizationCell } from '@/components/Cells';
import { StatusBadge } from '@/components/ui/StatusBadge';
import MetadataDialog from '@/components/dialogs/Metadata';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { IconButton } from '@astryxdesign/core/IconButton';
import { PageError, PageLoading } from '@/components/Utils';
import { useDeleteOrganization } from '@/lib/hooks/use-organization';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { zPageOrganizationSummary } from '@/lib/generated/platform-api-v1/zod.gen';
import type { OrganizationSummary } from '@/lib/generated/platform-api-v1/types.gen';
import { Table, type TableColumn, pixel, proportional } from '@astryxdesign/core/Table';
import { DeleteConfirmation, useDeleteDialog } from '@/components/dialogs/DeleteConfirmation';

/** Renders the admin organizations page. */
export default function AdminOrganizations() {
    const [metadataOrganization, setMetadataOrganization] = useState<OrganizationSummary | null>(null);
    const toast = useToast();
    const deleteOrganization = useDeleteOrganization();
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
        fallbackDescription: 'Delete this organization?',
        onSuccess: () => toast({ body: 'Organization deleted' }),
    });
    const pageMetadata = <NoIndex title="Organizations | LongLink" />;

    if (isLoading) {
        return (
            <>
                {pageMetadata}
                <PageLoading label="Loading organizations" />
            </>
        );
    }

    if (error && organizations.length === 0) {
        return (
            <>
                {pageMetadata}
                <PageError
                    description="We couldn't load the platform organizations."
                    title="Unable to load organizations"
                />
            </>
        );
    }

    return (
        <Stack gap={8}>
            {pageMetadata}
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
                columns={
                    [
                        {
                            key: 'name',
                            header: 'Name',
                            width: proportional(1),
                            renderCell: (organization) => (
                                <OrganizationCell
                                    endContent={<StatusBadge status={organization.status} />}
                                    organization={organization}
                                />
                            ),
                        },
                        {
                            align: 'end',
                            key: 'metadata',
                            header: '',
                            width: pixel(56),
                            renderCell: (organization) => (
                                <IconButton
                                    icon={<Ellipsis />}
                                    label={`View metadata for ${organization.name}`}
                                    size="sm"
                                    tooltip="View metadata"
                                    variant="ghost"
                                    onClick={() => setMetadataOrganization(organization)}
                                />
                            ),
                        },
                    ] satisfies TableColumn<OrganizationSummary>[]
                }
            />
            {metadataOrganization && (
                <MetadataDialog
                    onClose={() => setMetadataOrganization(null)}
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
