import { Banner } from '@astryxdesign/core/Banner';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { Table, type TableColumn, pixel, proportional } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useCollectionQuery } from '@/hooks/use-collection-query';
import type { OperationResponse } from '@/lib/generated/platform-api-v1/types.gen';
import { zOperationResponse } from '@/lib/generated/platform-api-v1/zod.gen';
import { platformApiPath } from '@/lib/platform-api';
import { dateTimeFormatter } from '@/lib/utils';
import { useAdminPagination } from '@/platform/admin/pagination';

/** Renders the admin operations page. */
export default function AdminOperations() {
    const statusLabels: Record<OperationResponse['status'], string> = {
        scheduled: 'Scheduled', active: 'Active', completed: 'Completed', failed: 'Failed',
    };
    const kindLabels: Record<OperationResponse['kind'], string> = {
        'compute.create': 'Compute creation', 'application.create': 'Application creation',
        'application.delete': 'Application deletion', 'organization.create': 'Organization creation',
        'organization.delete': 'Organization deletion',
    };
    const columns: TableColumn<OperationResponse>[] = [
        {
            key: 'operation',
            header: 'Operation',
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
            header: 'Timestamp',
            width: pixel(208),
            renderCell: (operation) => dateTimeFormatter.format(new Date(operation.created_at)),
        },
        {
            key: 'finished_at',
            header: 'Finished',
            width: pixel(208),
            renderCell: (operation) =>
                operation.finished_at ? dateTimeFormatter.format(new Date(operation.finished_at)) : '-',
        },
        {
            key: 'metadata',
            header: 'Metadata',
            width: proportional(2),
            renderCell: (operation) => (
                <VStack gap={1}>
                    <Text>
                        <Text type="supporting">ID</Text> <Text type="code">{operation.id}</Text>
                    </Text>
                    <Text>
                        <Text type="supporting">Target</Text>{' '}
                        <Text type="code">{operation.target_id}</Text>
                    </Text>
                </VStack>
            ),
        },
    ];
    const {
        items: operations,
        error,
        isLoading,
    } = useCollectionQuery<OperationResponse>(platformApiPath('/operations'), {
        refetchInterval: 5000,
        parse: (value) => zOperationResponse.array().parse(value),
    });
    const { pageItems, pagination } = useAdminPagination(operations, 'default');

    return (
        <VStack gap={6} width="100%">
            <VStack gap={1}>
                <Heading level={1}>Operations</Heading>
                <Text type="supporting">Track long-running Platform tasks, when they become available, and when they finish.</Text>
            </VStack>
            {isLoading && operations.length === 0 ? null : error && operations.length === 0 ? (
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
        </VStack>
    );
}
