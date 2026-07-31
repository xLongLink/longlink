import { Banner } from '@astryxdesign/core/Banner';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { useTranslator } from '@astryxdesign/core/i18n';
import { Table, type TableColumn, pixel, proportional } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useCollectionQuery } from '@/hooks/use-collection-query';
import { apiOperationSchema } from '@/lib/api-schemas';
import type { ApiOperation } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';
import { useAdminPagination } from '@/platform/admin/pagination';

/** Renders the admin operations page. */
export default function AdminOperations() {
    const t = useTranslator();
    const statusLabels: Record<ApiOperation['status'], string> = {
        scheduled: t('admin.operationStatus.scheduled'),
        active: t('admin.operationStatus.active'),
        completed: t('admin.operationStatus.completed'),
        failed: t('admin.operationStatus.failed'),
    };
    const kindLabels: Record<ApiOperation['kind'], string> = {
        'compute.reconcile': t('admin.computeReconciliation'),
        'application.create': t('admin.applicationCreation'),
        'application.delete': t('admin.applicationDeletion'),
        'organization.create': t('admin.organizationCreation'),
        'organization.delete': t('admin.organizationDeletion'),
    };
    const columns: TableColumn<ApiOperation>[] = [
        {
            key: 'operation',
            header: t('columns.operation'),
            width: proportional(1),
            renderCell: (operation) => (
                <VStack gap={1}>
                    <Text weight="semibold">{kindLabels[operation.kind]}</Text>
                    <Text type="supporting">{statusLabels[operation.status]}</Text>
                </VStack>
            ),
        },
        {
            key: 'timestamp',
            header: t('columns.timestamp'),
            width: pixel(208),
            renderCell: (operation) => formatDateTime(operation.created_at),
        },
        {
            key: 'finished_at',
            header: t('columns.finished'),
            width: pixel(208),
            renderCell: (operation) => (operation.finished_at ? formatDateTime(operation.finished_at) : '-'),
        },
        {
            key: 'metadata',
            header: t('columns.metadata'),
            width: proportional(2),
            renderCell: (operation) => (
                <VStack gap={1}>
                    <Text>
                        <Text type="supporting">{t('columns.id')}</Text> <Text type="code">{operation.id}</Text>
                    </Text>
                    <Text>
                        <Text type="supporting">{t('columns.target')}</Text>{' '}
                        <Text type="code">{operation.target_id}</Text>
                    </Text>
                    <Text type="supporting">Platform {operation.platform_version}</Text>
                </VStack>
            ),
        },
    ];
    const {
        items: operations,
        error,
        isLoading,
    } = useCollectionQuery<ApiOperation>('/api/operations', {
        refetchInterval: 5000,
        parse: (value) => apiOperationSchema.array().parse(value),
    });
    const { pageItems, pagination } = useAdminPagination(operations, 'default');

    return (
        <VStack gap={6} width="100%">
            <VStack gap={1}>
                <Heading level={1}>{t('admin.operationsTitle')}</Heading>
                <Text type="supporting">{t('admin.operationsDescription')}</Text>
            </VStack>
            {isLoading && operations.length === 0 ? null : error && operations.length === 0 ? (
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
        </VStack>
    );
}
