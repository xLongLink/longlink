import { useParams } from 'react-router';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { Heading } from '@astryxdesign/core/Heading';
import { pixel, proportional } from '@astryxdesign/core/Table';
import type { ApiComputePod } from '@/lib/types';
import { useTranslation } from '@/lib/i18n';
import { useComputePods, useComputes } from '@/data/compute';
import { DataTable, type DataTableColumn } from '@/components/DataTable';

/** Renders pods in a namespace on a compute backend. */
export default function ComputePods() {
    const { t } = useTranslation();
    const { compute = '', namespace = '' } = useParams();
    const columns: DataTableColumn<ApiComputePod>[] = [
        {
            key: 'name',
            header: t('columns.pod'),
            width: proportional(1),
            renderCell: (pod) => pod.name,
        },
        {
            key: 'status',
            header: t('columns.status'),
            width: pixel(112),
            renderCell: (pod) => pod.status,
        },
        {
            key: 'node',
            header: t('columns.node'),
            width: pixel(192),
            renderCell: (pod) => pod.node || '—',
        },
    ];
    const { items: computes, error: computeError, isLoading: computesIsLoading } = useComputes();
    const computeRegistry = computes.find((registry) => registry.slug === compute);
    const {
        items: rows,
        error: podsError,
        isLoading: podsIsLoading,
    } = useComputePods(computeRegistry?.id ?? '', namespace);
    const error =
        computeError ??
        (!computesIsLoading && !computeRegistry
            ? new Error(t('resources.computeNotFound', { name: compute }))
            : podsError);

    return (
        <VStack gap={6} width="100%">
            <VStack gap={1}>
                <Heading level={1}>{t('resources.podsTitle')}</Heading>
                <Text type="supporting">
                    {t('resources.podsDescription', { namespace, name: computeRegistry?.slug || compute })}
                </Text>
            </VStack>
            <DataTable
                columns={columns}
                data={rows}
                error={error}
                isLoading={computesIsLoading || podsIsLoading}
                pageSize={25}
            />
        </VStack>
    );
}
