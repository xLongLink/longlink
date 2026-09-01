import { api } from '@/lib/api';
import { useState } from 'react';
import { Ellipsis } from 'lucide-react';
import { Text } from '@astryxdesign/core/Text';
import { useToast } from '@/lib/hooks/use-toast';
import { Stack } from '@astryxdesign/core/Stack';
import { usePaginate } from '@/lib/hooks/pagination';
import { Heading } from '@astryxdesign/core/Heading';
import { Kubernetes } from '@/components/svg/Kubernetes';
import { StatusBadge } from '@/components/ui/StatusBadge';
import MetadataDialog from '@/components/dialogs/Metadata';
import { Table, TableColumn } from '@/components/ui/Table';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { IconButton } from '@astryxdesign/core/IconButton';
import { PageError, PageLoading } from '@/components/Utils';
import CreateCompute from '@/components/dialogs/CreateCompute';
import { pixel, proportional } from '@astryxdesign/core/Table';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { zPageComputeRegistryResponse } from '@/lib/generated/platform-api-v1/zod.gen';
import type { ComputeRegistryResponse } from '@/lib/generated/platform-api-v1/types.gen';
import { DeleteConfirmation, useDeleteDialog } from '@/components/dialogs/DeleteConfirmation';

/** Renders the admin compute page. */
export default function AdminCompute() {
    const [metadataCompute, setMetadataCompute] = useState<ComputeRegistryResponse | null>(null);
    const toast = useToast();
    const queryClient = useQueryClient();
    const closeMetadataCompute = () => setMetadataCompute(null);
    const deleteCompute = useMutation({
        mutationFn: (computeId: string) => api(`/api/v1/computes/${computeId}`, { method: 'DELETE' }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['api', '/api/v1/computes'] });
            toast({ body: 'Compute deleted' });
        },
    });
    const {
        items: computes,
        error,
        isLoading,
        pagination,
    } = usePaginate('/api/v1/computes', zPageComputeRegistryResponse, 5000);
    const deleteDialog = useDeleteDialog({
        title: 'Delete compute',
        mutation: deleteCompute,
        items: computes,
        getId: (compute) => compute.id,
        description: (compute) =>
            `Remove compute ${compute.name} from the LongLink Platform? Its Kubernetes resources will remain unchanged.`,
        errorMessage: 'Failed to delete compute',
        fallbackDescription:
            'Remove this compute from the LongLink Platform? Its Kubernetes resources will remain unchanged.',
        onError: (message) => toast({ body: message, type: 'error' }),
    });

    if (isLoading) {
        return <PageLoading label="Loading compute registries" />;
    }

    if (error && computes.length === 0) {
        return <PageError description="We couldn't load the compute registries." title="Unable to load compute" />;
    }

    return (
        <Stack gap={8}>
            <Stack direction="horizontal" justify="between" align="center" wrap="wrap">
                <Stack>
                    <Heading level={1}>Compute</Heading>
                    <Text as="p" color="secondary">
                        Inspect runtime workloads, node capacity, and orchestration status.
                    </Text>
                </Stack>
                <CreateCompute />
            </Stack>
            <Table
                data={computes}
                density="compact"
                emptyState={<EmptyState title="No results." isCompact />}
                hasHover
                idKey="id"
                plugins={{ pagination }}
            >
                <TableColumn<ComputeRegistryResponse> field="compute" header="Compute" width={proportional(2)}>
                    {(compute) => (
                        <Stack direction="horizontal" gap={3} align="center">
                            <Kubernetes height={24} width={24} />
                            <Stack>
                                <Stack direction="horizontal" gap={1} align="center">
                                    <Text weight="semibold">{compute.name}</Text>
                                    <StatusBadge status={compute.status} />
                                </Stack>
                                <Text type="supporting">
                                    {compute.gateway_url ??
                                        (compute.status === 'creating'
                                            ? 'Provisioning gateway'
                                            : 'Gateway unavailable')}
                                </Text>
                            </Stack>
                        </Stack>
                    )}
                </TableColumn>
                <TableColumn<ComputeRegistryResponse> align="end" field="metadata" header="" width={pixel(56)}>
                    {(compute) => (
                        <IconButton
                            icon={<Ellipsis />}
                            label={`View metadata for ${compute.name}`}
                            size="sm"
                            tooltip="View metadata"
                            variant="ghost"
                            onClick={() => setMetadataCompute(compute)}
                        />
                    )}
                </TableColumn>
            </Table>
            {metadataCompute && (
                <MetadataDialog
                    onClose={closeMetadataCompute}
                    onDelete={() => deleteDialog.openFor(metadataCompute)}
                    title="Compute metadata"
                >
                    <MetadataList>
                        <MetadataListItem label="Status">
                            <StatusBadge status={metadataCompute.status} />
                        </MetadataListItem>
                        <MetadataListItem label="Gateway">
                            {metadataCompute.gateway_url ?? 'Unavailable'}
                        </MetadataListItem>
                        <MetadataListItem label="ID">{metadataCompute.id}</MetadataListItem>
                    </MetadataList>
                </MetadataDialog>
            )}
            <DeleteConfirmation {...deleteDialog.dialogProps} />
        </Stack>
    );
}
