import { useState } from 'react';
import { Ellipsis } from 'lucide-react';
import Logs from '@/components/dialogs/Logs';
import { Text } from '@astryxdesign/core/Text';
import { dateTimeFormatter } from '@/lib/utils';
import { Stack } from '@astryxdesign/core/Stack';
import { usePaginate } from '@/lib/hooks/pagination';
import { Heading } from '@astryxdesign/core/Heading';
import MetadataDialog from '@/components/dialogs/Metadata';
import { Table, TableColumn } from '@/components/ui/Table';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { PageError, PageLoading } from '@/components/Utils';
import { DropdownMenu } from '@astryxdesign/core/DropdownMenu';
import { pixel, proportional } from '@astryxdesign/core/Table';
import { zPageOperationResponse } from '@/lib/generated/platform-api-v1/zod.gen';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import type { OperationResponse } from '@/lib/generated/platform-api-v1/types.gen';

const statusLabels: Record<OperationResponse['status'], string> = {
    scheduled: 'Scheduled',
    active: 'Active',
    completed: 'Completed',
    failed: 'Failed',
};
const kindLabels: Record<OperationResponse['kind'], string> = {
    'compute.create': 'Compute creation',
    'solution.create': 'Solution creation',
    'solution.delete': 'Solution deletion',
    'organization.create': 'Organization creation',
    'organization.delete': 'Organization deletion',
};
const resourceLabels: Record<OperationResponse['kind'], string> = {
    'compute.create': 'Compute',
    'solution.create': 'Solution',
    'solution.delete': 'Solution',
    'organization.create': 'Organization',
    'organization.delete': 'Organization',
};

/** Formats an operation timestamp for display. */
function formatOperationDate(value: string): string {
    return dateTimeFormatter.format(new Date(value)).replace(', ', ' ');
}

/** Renders the admin operations page. */
export default function AdminOperations() {
    const [logOperation, setLogOperation] = useState<OperationResponse | null>(null);
    const [metadataOperation, setMetadataOperation] = useState<OperationResponse | null>(null);
    const {
        items: operations,
        error,
        isLoading,
        pagination,
    } = usePaginate('/api/v1/operations', zPageOperationResponse, 5000);
    if (isLoading) {
        return <PageLoading label="Loading operations" />;
    }

    if (error && operations.length === 0) {
        return <PageError description="We couldn't load the platform operations." title="Unable to load operations" />;
    }

    return (
        <Stack gap={8}>
            <Stack>
                <Heading level={1}>Operations</Heading>
                <Text as="p" color="secondary">
                    Track long-running Platform tasks, when they become available, and when they finish.
                </Text>
            </Stack>
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
                        <Stack>
                            <Text weight="semibold">{kindLabels[operation.kind]}</Text>
                            <Text type="supporting">
                                {operation.finished_at
                                    ? `${statusLabels[operation.status]} - ${formatOperationDate(operation.finished_at)}`
                                    : `Started - ${formatOperationDate(operation.created_at)}`}
                            </Text>
                        </Stack>
                    )}
                </TableColumn>
                <TableColumn<OperationResponse> field="resource" header="Resource" width={proportional(1)}>
                    {(operation) => (
                        <Stack>
                            <Text weight="semibold">{operation.resource?.name ?? 'Resource unavailable'}</Text>
                            <Text type="supporting">{resourceLabels[operation.kind]}</Text>
                        </Stack>
                    )}
                </TableColumn>
                <TableColumn<OperationResponse> align="end" field="actions" header="" width={pixel(56)}>
                    {(operation) => (
                        <DropdownMenu
                            button={{
                                icon: <Ellipsis />,
                                isIconOnly: true,
                                label: `Actions for ${kindLabels[operation.kind]}`,
                                size: 'sm',
                                variant: 'ghost',
                            }}
                            hasChevron={false}
                            items={[
                                { label: 'Metadata', onClick: () => setMetadataOperation(operation) },
                                {
                                    isDisabled: operation.finished_at === null,
                                    label: 'Logs',
                                    onClick: () => setLogOperation(operation),
                                },
                            ]}
                        />
                    )}
                </TableColumn>
            </Table>
            {metadataOperation ? (
                <MetadataDialog onClose={() => setMetadataOperation(null)} title="Operation metadata">
                    <MetadataList>
                        <MetadataListItem label="Operation">{kindLabels[metadataOperation.kind]}</MetadataListItem>
                        <MetadataListItem label="Status">{statusLabels[metadataOperation.status]}</MetadataListItem>
                        <MetadataListItem label="ID">{metadataOperation.id}</MetadataListItem>
                        <MetadataListItem label="Target">{metadataOperation.target_id}</MetadataListItem>
                        <MetadataListItem label="Created">
                            {formatOperationDate(metadataOperation.created_at)}
                        </MetadataListItem>
                        {metadataOperation.finished_at ? (
                            <MetadataListItem label="Finished">
                                {formatOperationDate(metadataOperation.finished_at)}
                            </MetadataListItem>
                        ) : null}
                        {metadataOperation.failed ? (
                            <MetadataListItem label="Reason">{metadataOperation.failed}</MetadataListItem>
                        ) : null}
                    </MetadataList>
                </MetadataDialog>
            ) : null}
            {logOperation ? (
                <Logs
                    kind="operation"
                    onOpenChange={(open) => {
                        if (!open) {
                            setLogOperation(null);
                        }
                    }}
                    resourceId={logOperation.id}
                />
            ) : null}
        </Stack>
    );
}
