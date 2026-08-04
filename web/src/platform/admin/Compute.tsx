import { Banner } from '@astryxdesign/core/Banner';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { useTranslator } from '@astryxdesign/core/i18n';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Table, type TableColumn, pixel, proportional } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Wrench } from 'lucide-react';
import CreateCompute from '@/components/dialogs/CreateCompute';
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';
import { useCollectionQuery } from '@/hooks/use-collection-query';
import { useToast } from '@/hooks/use-toast';
import { fetchApiVoid } from '@/lib/api';
import type { ComputeRegistryResponse } from '@/lib/generated/platform-api-v1/types.gen';
import { zComputeRegistryResponse } from '@/lib/generated/platform-api-v1/zod.gen';
import { platformApiPath } from '@/lib/platform-api';
import { computesQueryKey } from '@/lib/query-keys';
import { useDeleteDialog } from '@/lib/utils';
import { useAdminPagination } from '@/platform/admin/pagination';

/** Renders the admin compute page. */
export default function AdminCompute() {
    const t = useTranslator();
    const toast = useToast();
    const queryClient = useQueryClient();
    const deleteCompute = useMutation({
        mutationFn: (computeId: string) =>
            fetchApiVoid(platformApiPath(`/computes/${computeId}`), { method: 'DELETE' }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: computesQueryKey });
            toast({ body: t('admin.computeDeleted') });
        },
    });
    const {
        items: computes,
        error,
        isLoading,
    } = useCollectionQuery<ComputeRegistryResponse>(platformApiPath('/computes'), {
        refetchInterval: 5000,
        parse: (value) => zComputeRegistryResponse.array().parse(value),
    });
    const { pageItems, pagination } = useAdminPagination(computes);
    const deleteDialog = useDeleteDialog({
        title: t('admin.deleteComputeTitle'),
        mutation: deleteCompute,
        items: computes,
        getId: (compute) => compute.id,
        description: (compute) => t('admin.deleteComputeDescription', { name: compute.name }),
        errorMessage: t('admin.failedDeleteCompute'),
        fallbackDescription: t('admin.deleteComputeFallback'),
        onError: (message) => toast({ body: message, type: 'error' }),
    });
    const columns: TableColumn<ComputeRegistryResponse>[] = [
        {
            key: 'compute',
            header: t('admin.computeTitle'),
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
            header: t('columns.action'),
            width: pixel(96),
            align: 'end',
            renderCell: (compute) => (
                <MoreMenu
                    label={t('common.openActionsFor', { name: compute.name })}
                    size="sm"
                    items={[{ label: t('actions.delete'), onClick: () => deleteDialog.openFor(compute) }]}
                />
            ),
        },
    ];

    return (
        <VStack gap={6} width="100%">
            <HStack gap={4} justify="between" align="end" wrap="wrap">
                <VStack gap={1}>
                    <Heading level={1}>{t('admin.computeTitle')}</Heading>
                    <Text type="supporting">{t('admin.computeDescription')}</Text>
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
                    emptyState={<EmptyState title={t('common.noResults')} isCompact />}
                    hasHover
                    idKey="id"
                    plugins={{ pagination }}
                />
            )}
            <DeleteConfirmation {...deleteDialog.dialogProps} />
        </VStack>
    );
}
