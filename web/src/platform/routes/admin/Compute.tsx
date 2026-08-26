import { api } from '@/lib/api';
import { Badge } from '@astryxdesign/core/Badge';
import { useDeleteDialog } from '@/lib/utils';
import { Text } from '@astryxdesign/core/Text';
import { useToast } from '@/lib/hooks/use-toast';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { usePaginate } from '@/lib/hooks/pagination';
import { Heading } from '@astryxdesign/core/Heading';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Kubernetes } from '@/components/svg/Kubernetes';
import { Table, TableColumn } from '@/components/ui/Table';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { PageError, PageLoading } from '@/components/Utils';
import CreateCompute from '@/components/dialogs/CreateCompute';
import { pixel, proportional } from '@astryxdesign/core/Table';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';
import { zPageComputeRegistryResponse } from '@/lib/generated/platform-api-v1/zod.gen';
import type { ComputeRegistryResponse } from '@/lib/generated/platform-api-v1/types.gen';
import type { ComponentProps } from 'react';

const statusPresentation = {
    creating: { label: 'Creating', variant: 'info' },
    failed: { label: 'Failed', variant: 'error' },
    running: { label: 'Running', variant: 'neutral' },
} satisfies Record<
    ComputeRegistryResponse['status'],
    { label: string; variant: ComponentProps<typeof Badge>['variant'] }
>;

/** Renders the admin compute page. */
export default function AdminCompute() {
    const toast = useToast();
    const queryClient = useQueryClient();
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

    if (isLoading && computes.length === 0) {
        return <PageLoading label="Loading compute registries" />;
    }

    if (error && computes.length === 0) {
        return <PageError description="We couldn't load the compute registries." title="Unable to load compute" />;
    }

    return (
        <VStack gap={6} width="100%">
            <HStack gap={0} justify="between" align="center" wrap="wrap">
                <VStack gap={0}>
                    <Heading level={1}>Compute</Heading>
                    <Text as="p" color="secondary">
                        Inspect runtime workloads, node capacity, and orchestration status.
                    </Text>
                </VStack>
                <CreateCompute />
            </HStack>
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
                        <HStack gap={3} align="center">
                            <Kubernetes height={24} width={24} />
                            <VStack>
                                <HStack gap={1} align="center">
                                    <Text weight="semibold">{compute.name}</Text>
                                    <Badge {...statusPresentation[compute.status]} />
                                </HStack>
                                <Text type="supporting">
                                    {compute.gateway_url ??
                                        (compute.status === 'creating'
                                            ? 'Provisioning gateway'
                                            : 'Gateway unavailable')}
                                </Text>
                            </VStack>
                        </HStack>
                    )}
                </TableColumn>
                <TableColumn<ComputeRegistryResponse> align="end" field="actions" header="Action" width={pixel(96)}>
                    {(compute) => (
                        <MoreMenu
                            label={`Open actions for ${compute.name}`}
                            size="sm"
                            items={[{ label: 'Delete', onClick: () => deleteDialog.openFor(compute) }]}
                        />
                    )}
                </TableColumn>
            </Table>
            <DeleteConfirmation {...deleteDialog.dialogProps} />
        </VStack>
    );
}
