import { Wrench } from 'lucide-react';
import { Text } from '@astryxdesign/core/Text';
import { Banner } from '@astryxdesign/core/Banner';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Heading } from '@astryxdesign/core/Heading';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, type TableColumn, pixel, proportional } from '@astryxdesign/core/Table';
import type { ComputeRegistryResponse } from '@/lib/generated/platform-api-v1/types.gen';
import { fetchApiVoid } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useApiQuery } from '@/hooks/use-api';
import { useDeleteDialog } from '@/lib/utils';
import { computesQueryKey } from '@/lib/query-keys';
import { platformApiPath } from '@/lib/platform-api';
import CreateCompute from '@/components/dialogs/CreateCompute';
import { useAdminPagination } from '@/platform/admin/pagination';
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';
import { zComputeRegistryResponse } from '@/lib/generated/platform-api-v1/zod.gen';

/** Renders the admin compute page. */
export default function AdminCompute() {
    const toast = useToast();
    const queryClient = useQueryClient();
    const deleteCompute = useMutation({
        mutationFn: (computeId: string) =>
            fetchApiVoid(platformApiPath(`/computes/${computeId}`), { method: 'DELETE' }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: computesQueryKey });
            toast({ body: 'Compute deleted' });
        },
    });
    const {
        data: computes = [],
        error,
        isLoading,
    } = useApiQuery<ComputeRegistryResponse[]>(platformApiPath('/computes'), {
        refetchInterval: 5000,
        parse: (value) => zComputeRegistryResponse.array().parse(value),
    });
    const { pageItems, pagination } = useAdminPagination(computes);
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
    const columns: TableColumn<ComputeRegistryResponse>[] = [
        {
            key: 'compute',
            header: 'Compute',
            width: proportional(2),
            renderCell: (compute) => (
                <HStack gap={3} align="center">
                    <Wrench className="text-accent" size={20} />
                    <VStack gap={1}>
                        <Text weight="semibold">{compute.name}</Text>
                        <Text type="supporting">{compute.gateway_url}</Text>
                    </VStack>
                </HStack>
            ),
        },
        {
            key: 'actions',
            header: 'Action',
            width: pixel(96),
            align: 'end',
            renderCell: (compute) => (
                <MoreMenu
                    label={`Open actions for ${compute.name}`}
                    size="sm"
                    items={[{ label: 'Delete', onClick: () => deleteDialog.openFor(compute) }]}
                />
            ),
        },
    ];

    return (
        <VStack gap={6} width="100%">
            <HStack gap={4} justify="between" align="end" wrap="wrap">
                <VStack gap={1}>
                    <Heading level={1}>Compute</Heading>
                    <Text type="supporting">Inspect runtime workloads, node capacity, and orchestration status.</Text>
                </VStack>
                <CreateCompute />
            </HStack>
            {isLoading && computes.length === 0 ? null : error && computes.length === 0 ? (
                <Banner status="error" title={error.message} />
            ) : (
                <Table
                    columns={columns}
                    data={pageItems}
                    density="compact"
                    emptyState={<EmptyState title="No results." isCompact />}
                    hasHover
                    idKey="id"
                    plugins={{ pagination }}
                />
            )}
            <DeleteConfirmation {...deleteDialog.dialogProps} />
        </VStack>
    );
}
