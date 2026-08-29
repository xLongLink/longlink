import { api } from '@/lib/api';
import { Ellipsis } from 'lucide-react';
import { Stack } from '@/components/ui/Stack';
import { useDeleteDialog } from '@/lib/utils';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/lib/hooks/use-toast';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { usePaginate } from '@/lib/hooks/pagination';
import { Heading } from '@astryxdesign/core/Heading';
import { useState, type ComponentProps } from 'react';
import { Table, TableColumn } from '@/components/ui/Table';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { IconButton } from '@astryxdesign/core/IconButton';
import { PageError, PageLoading } from '@/components/Utils';
import { pixel, proportional } from '@astryxdesign/core/Table';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { zPageOrganizationSummary } from '@/lib/generated/platform-api-v1/zod.gen';
import type { OrganizationSummary, Status } from '@/lib/generated/platform-api-v1/types.gen';

const statusPresentation = {
    creating: { label: 'Creating', variant: 'info' },
    failed: { label: 'Failed', variant: 'error' },
    running: { label: 'Running', variant: 'neutral' },
} satisfies Record<Status, { label: string; variant: ComponentProps<typeof Badge>['variant'] }>;

/** Renders the admin organizations page. */
export default function AdminOrganizations() {
    const [metadataOrganization, setMetadataOrganization] = useState<OrganizationSummary | null>(null);
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
        <Stack gap={8} width="100%">
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
                                {organization.status === 'running' ? null : (
                                    <Badge {...statusPresentation[organization.status]} />
                                )}
                                <Link href={`/orgs/${organization.slug}`} weight="semibold">
                                    {organization.name}
                                </Link>
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
            {metadataOrganization ? (
                <Dialog
                    isOpen
                    onOpenChange={(isOpen) => {
                        if (!isOpen) {
                            setMetadataOrganization(null);
                        }
                    }}
                    purpose="info"
                    width={560}
                >
                    <Layout
                        header={
                            <DialogHeader
                                title="Organization metadata"
                                onOpenChange={() => setMetadataOrganization(null)}
                            />
                        }
                        content={
                            <LayoutContent>
                                <MetadataList>
                                    <MetadataListItem label="Status">
                                        {metadataOrganization.status === 'running' ? null : (
                                            <Badge {...statusPresentation[metadataOrganization.status]} />
                                        )}
                                    </MetadataListItem>
                                    <MetadataListItem label="Slug">{metadataOrganization.slug}</MetadataListItem>
                                    <MetadataListItem label="ID">{metadataOrganization.id}</MetadataListItem>
                                </MetadataList>
                            </LayoutContent>
                        }
                        footer={
                            <LayoutFooter>
                                <Stack direction="horizontal" gap={2} justify="end">
                                    <Button
                                        className="text-warning underline"
                                        label="Delete"
                                        variant="ghost"
                                        onClick={() => {
                                            const organization = metadataOrganization;
                                            setMetadataOrganization(null);
                                            deleteDialog.openFor(organization);
                                        }}
                                    />
                                    <Button
                                        label="Close"
                                        variant="primary"
                                        onClick={() => setMetadataOrganization(null)}
                                    />
                                </Stack>
                            </LayoutFooter>
                        }
                    />
                </Dialog>
            ) : null}
            <DeleteConfirmation {...deleteDialog.dialogProps} />
        </Stack>
    );
}
