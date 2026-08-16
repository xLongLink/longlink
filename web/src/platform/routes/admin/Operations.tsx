import { Text } from '@astryxdesign/core/Text';
import { Banner } from '@astryxdesign/core/Banner';
import { VStack } from '@astryxdesign/core/VStack';
import { Heading } from '@astryxdesign/core/Heading';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { pixel, proportional } from '@astryxdesign/core/Table';
import type { OperationResponse } from '@/lib/generated/platform-api-v1/types.gen';
import { dateTimeFormatter } from '@/lib/utils';
import { useApiQuery } from '@/lib/hooks/use-api';
import { usePaginate } from '@/lib/hooks/pagination';
import { platformApiPath } from '@/lib/platform-api';
import { Table, TableColumn } from '@/components/ui/Table';
import { zOperationResponse } from '@/lib/generated/platform-api-v1/zod.gen';

/** Renders the admin operations page. */
export default function AdminOperations() {
    const statusLabels: Record<OperationResponse['status'], string> = {
        scheduled: 'Scheduled',
        active: 'Active',
        completed: 'Completed',
        failed: 'Failed',
    };
    const kindLabels: Record<OperationResponse['kind'], string> = {
        'compute.create': 'Compute creation',
        'application.create': 'Application creation',
        'application.delete': 'Application deletion',
        'organization.create': 'Organization creation',
        'organization.delete': 'Organization deletion',
    };
    const {
        data: operations = [],
        error,
        isLoading,
    } = useApiQuery<OperationResponse[]>(platformApiPath('/operations'), {
        refetchInterval: 5000,
        parse: (value) => zOperationResponse.array().parse(value),
    });
    const { pageItems, pagination } = usePaginate(operations);

    return (
        <VStack gap={6} width="100%">
            <VStack gap={1}>
                <Heading level={1}>Operations</Heading>
                <Text type="supporting">
                    Track long-running Platform tasks, when they become available, and when they finish.
                </Text>
            </VStack>
            {isLoading && operations.length === 0 ? null : error && operations.length === 0 ? (
                <Banner status="error" title={error.message} />
            ) : (
                <Table
                    data={pageItems}
                    density="compact"
                    emptyState={<EmptyState title="No results." isCompact />}
                    hasHover
                    idKey="id"
                    plugins={{ pagination }}
                >
                    <TableColumn<OperationResponse> field="operation" header="Operation" width={proportional(1)}>
                        {(operation) => (
                            <VStack gap={1}>
                                <Text weight="semibold">{kindLabels[operation.kind]}</Text>
                                <Text type="supporting">{statusLabels[operation.status]}</Text>
                            </VStack>
                        )}
                    </TableColumn>
                    <TableColumn<OperationResponse> field="timestamp" header="Timestamp" width={pixel(208)}>
                        {(operation) => dateTimeFormatter.format(new Date(operation.created_at))}
                    </TableColumn>
                    <TableColumn<OperationResponse> field="finished_at" header="Finished" width={pixel(208)}>
                        {(operation) =>
                            operation.finished_at ? dateTimeFormatter.format(new Date(operation.finished_at)) : '-'
                        }
                    </TableColumn>
                    <TableColumn<OperationResponse> field="metadata" header="Metadata" width={proportional(2)}>
                        {(operation) => (
                            <VStack gap={1}>
                                <Text>
                                    <Text type="supporting">ID</Text> <Text type="code">{operation.id}</Text>
                                </Text>
                                <Text>
                                    <Text type="supporting">Target</Text> <Text type="code">{operation.target_id}</Text>
                                </Text>
                            </VStack>
                        )}
                    </TableColumn>
                </Table>
            )}
        </VStack>
    );
}
