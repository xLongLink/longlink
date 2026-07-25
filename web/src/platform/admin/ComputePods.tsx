import { useParams } from 'react-router';
import { Text } from '@astryxdesign/core/Text';
import { Banner } from '@astryxdesign/core/Banner';
import { VStack } from '@astryxdesign/core/VStack';
import { Heading } from '@astryxdesign/core/Heading';
import { useTranslator } from '@astryxdesign/core/i18n';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Table, type TableColumn, pixel, proportional } from '@astryxdesign/core/Table';
import type { ApiComputePod } from '@/lib/types';
import { useComputePods, useComputes } from '@/data/compute';
import { useAdminPagination } from '@/platform/admin/pagination';

/** Renders pods in a namespace on a compute backend. */
export default function ComputePods() {
    const t = useTranslator();
    const { compute = '', namespace = '' } = useParams();
    const columns: TableColumn<ApiComputePod>[] = [
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
    const { pageItems, pagination } = useAdminPagination(rows);
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
            {(computesIsLoading || podsIsLoading) && rows.length === 0 ? null : error && rows.length === 0 ? (
                <Banner status="error" title={error.message} />
            ) : (
                <Table
                    columns={columns}
                    data={pageItems}
                    density="compact"
                    emptyState={<EmptyState title={t('common.noResults')} isCompact />}
                    hasHover
                    idKey="name"
                    plugins={{ pagination }}
                />
            )}
        </VStack>
    );
}
