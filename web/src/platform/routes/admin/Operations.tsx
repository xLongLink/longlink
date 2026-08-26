import { useState } from 'react';
import { Text } from '@astryxdesign/core/Text';
import { dateTimeFormatter } from '@/lib/utils';
import { Button } from '@astryxdesign/core/Button';
import { VStack } from '@astryxdesign/core/VStack';
import { usePaginate } from '@/lib/hooks/pagination';
import { Heading } from '@astryxdesign/core/Heading';
import { Table, TableColumn } from '@/components/ui/Table';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { PageError, PageLoading } from '@/components/Utils';
import OperationLogs from '@/components/dialogs/OperationLogs';
import { pixel, proportional } from '@astryxdesign/core/Table';
import { zPageOperationResponse } from '@/lib/generated/platform-api-v1/zod.gen';
import type { OperationResponse } from '@/lib/generated/platform-api-v1/types.gen';

/** Renders the admin operations page. */
export default function AdminOperations() {
    const [logOperation, setLogOperation] = useState<OperationResponse | null>(null);
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
        items: operations,
        error,
        isLoading,
        pagination,
    } = usePaginate('/api/v1/operations', zPageOperationResponse, 5000);

    if (isLoading && operations.length === 0) {
        return <PageLoading label="Loading operations" />;
    }

    if (error && operations.length === 0) {
        return <PageError description="We couldn't load the platform operations." title="Unable to load operations" />;
    }

    return (
        <VStack gap={6} width="100%">
            <VStack gap={0}>
                <Heading level={1}>Operations</Heading>
                <Text as="p" color="secondary">
                    Track long-running Platform tasks, when they become available, and when they finish.
                </Text>
            </VStack>
            <Table
                data={operations}
                density="compact"
                emptyState={<EmptyState title="No results." isCompact />}
                hasHover
                idKey="id"
                plugins={{ pagination }}
            >
                <TableColumn<OperationResponse> field="operation" header="Operation" width={proportional(1)}>
                    {(operation) => (
                        <VStack>
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
                            {operation.status === 'failed' && operation.failed ? (
                                <Text>
                                    <Text type="supporting">Reason</Text> {operation.failed}
                                </Text>
                            ) : null}
                        </VStack>
                    )}
                </TableColumn>
                <TableColumn<OperationResponse> align="end" field="actions" header="Action" width={pixel(96)}>
                    {(operation) => (
                        <Button
                            label="Logs"
                            size="sm"
                            variant="ghost"
                            isDisabled={operation.finished_at === null}
                            onClick={() => setLogOperation(operation)}
                        />
                    )}
                </TableColumn>
            </Table>
            {logOperation ? (
                <OperationLogs
                    operationId={logOperation.id}
                    operationName={kindLabels[logOperation.kind]}
                    onOpenChange={(open) => {
                        if (!open) {
                            setLogOperation(null);
                        }
                    }}
                />
            ) : null}
        </VStack>
    );
}
