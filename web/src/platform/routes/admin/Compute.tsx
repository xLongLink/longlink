import { api } from '@/lib/api';
import { Wrench } from 'lucide-react';
import { useDeleteDialog } from '@/lib/utils';
import { Text } from '@astryxdesign/core/Text';
import { useToast } from '@/lib/hooks/use-toast';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { usePaginate } from '@/lib/hooks/pagination';
import { Heading } from '@astryxdesign/core/Heading';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Table, TableColumn } from '@/components/ui/Table';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { PageError, PageLoading } from '@/components/Utils';
import CreateCompute from '@/components/dialogs/CreateCompute';
import { pixel, proportional } from '@astryxdesign/core/Table';
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zComputeRegistryResponse } from '@/lib/generated/platform-api-v1/zod.gen';
import type { ComputeRegistryResponse } from '@/lib/generated/platform-api-v1/types.gen';

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
        data: computes = [],
        error,
        isLoading,
    } = useQuery({
        queryKey: ['api', '/api/v1/computes'],
        queryFn: async ({ signal }) =>
            zComputeRegistryResponse.array().parse(await api('/api/v1/computes', { signal }).json()),
        refetchInterval: 5000,
    });
    const { pageItems, pagination } = usePaginate(computes);
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
            <HStack gap={4} justify="between" align="end" wrap="wrap">
                <VStack gap={1}>
                    <Heading level={1}>Compute</Heading>
                    <Text type="supporting">Inspect runtime workloads, node capacity, and orchestration status.</Text>
                </VStack>
                <CreateCompute />
            </HStack>
            <Table
                data={pageItems}
                density="compact"
                emptyState={<EmptyState title="No results." isCompact />}
                hasHover
                idKey="id"
                plugins={{ pagination }}
            >
                <TableColumn<ComputeRegistryResponse> field="compute" header="Compute" width={proportional(2)}>
                    {(compute) => (
                        <HStack gap={3} align="center">
                            <Wrench className="text-accent" size={20} />
                            <VStack gap={1}>
                                <Text weight="semibold">{compute.name}</Text>
                                <Text type="supporting">{compute.gateway_url}</Text>
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
