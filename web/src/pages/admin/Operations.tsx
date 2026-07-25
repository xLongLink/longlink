import { useState } from 'react';
import { Text } from '@astryxdesign/core/Text';
import { Banner } from '@astryxdesign/core/Banner';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Heading } from '@astryxdesign/core/Heading';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { type TranslatorFn, useTranslator } from '@astryxdesign/core/i18n';
import {
    Table,
    type TableColumn,
    pixel,
    paginateData,
    proportional,
    useTablePagination,
} from '@astryxdesign/core/Table';
import type { ApiOperation } from '@/lib/types';
import { useOperations } from '@/data/admin';
import { formatDateTime } from '@/lib/utils';

/** Returns localized admin operation table columns. */
function createOperationColumns(t: TranslatorFn): TableColumn<ApiOperation>[] {
    const statusLabels: Record<ApiOperation['status'], string> = {
        scheduled: t('admin.operationStatus.scheduled'),
        active: t('admin.operationStatus.active'),
        completed: t('admin.operationStatus.completed'),
        failed: t('admin.operationStatus.failed'),
    };

    return [
        {
            key: 'operation',
            header: t('columns.operation'),
            width: proportional(1),
            renderCell: (operation) => (
                <VStack gap={1}>
                    <Text weight="semibold">{t('admin.computeReconciliation')}</Text>
                    <Text type="supporting">{statusLabels[operation.status]}</Text>
                </VStack>
            ),
        },
        {
            key: 'timestamp',
            header: t('columns.timestamp'),
            width: pixel(288),
            renderCell: (operation) => (
                <VStack gap={1}>
                    <Text>
                        <Text type="supporting">{t('columns.created')}</Text> {formatDateTime(operation.created_at)}
                    </Text>
                    <Text>
                        <Text type="supporting">{t('admin.operationStatus.scheduled')}</Text>{' '}
                        {formatDateTime(operation.scheduled_at)}
                    </Text>
                    <Text>
                        <Text type="supporting">{t('columns.started')}</Text>{' '}
                        {operation.started_at ? formatDateTime(operation.started_at) : '—'}
                    </Text>
                </VStack>
            ),
        },
        {
            key: 'stopped_at',
            header: t('columns.stopped'),
            width: pixel(208),
            renderCell: (operation) => (operation.stopped_at ? formatDateTime(operation.stopped_at) : '—'),
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
                        <Text type="supporting">{t('admin.computeTitle')}</Text>{' '}
                        <Text type="code">{operation.compute_id}</Text>
                    </Text>
                    <HStack gap={3}>
                        <Text type="supporting">Platform {operation.platform_version}</Text>
                        <Text type="supporting">Attempts {operation.attempt_count}</Text>
                    </HStack>
                    {operation.error ? <Banner status="error" title={operation.error} /> : null}
                </VStack>
            ),
        },
    ];
}

/** Renders the admin operations page. */
export default function AdminOperations() {
    const t = useTranslator();
    const { items: operations, error, isLoading } = useOperations();
    const [page, setPage] = useState(1);
    const pageSize = 25;
    const pageCount = Math.max(1, Math.ceil(operations.length / pageSize));
    const currentPage = Math.min(page, pageCount);
    const pagination = useTablePagination<ApiOperation>({
        page: currentPage,
        onPageChange: setPage,
        totalItems: operations.length,
        pageSize,
    });

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
                    columns={createOperationColumns(t)}
                    data={paginateData(operations, currentPage, pageSize)}
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
