import type { z } from 'zod';
import { useRef } from 'react';
import { useFilters } from './use-filters';
import { useMetadata } from './use-metadata';
import { useApi } from '@/lib/hooks/use-api';
import { Boxes, Info, X } from 'lucide-react';
import { Input } from '@/components/longlink/form/input';
import { Text } from '@/components/longlink/display/text';
import { Stack } from '@/components/longlink/layout/stack';
import { Badge } from '@/components/longlink/display/badge';
import { Button } from '@/components/longlink/action/button';
import { Dialog } from '@/components/longlink/layout/dialog';
import { Avatar } from '@/components/longlink/display/avatar';
import { Heading } from '@/components/longlink/display/heading';
import { Timestamp } from '@/components/longlink/display/timestamp';
import { zOperationResponse, zPageOperationResponse } from '@/lib/generated/platform-api-v1/zod.gen';
import {
    Frame,
    useTable,
    dataGridFeatures,
    type DataGridFeatures,
    type ColumnDef,
    DataGrid,
    DataGridPagination,
    DataGridScrollArea,
    DataGridTable
} from '@/components/longlink';

type OperationResponse = z.infer<typeof zOperationResponse>;

const kinds = {
    'solution.deploy': 'Solution deployment',
    'solution.delete': 'Solution deletion',
    'organization.create': 'Organization creation',
    'organization.delete': 'Organization deletion'
};

const statuses = { scheduled: 'Planned', active: 'Active', completed: 'Completed', failed: 'Failed' };

/** Lists operation history and exposes its metadata. */
export default function Operations() {
    const { search, pagination, suffix, setSearch, setPagination } = useFilters();
    const input = useRef<HTMLInputElement>(null);
    const searchField = (
        <Stack direction="horizontal" gap={1} align="center">
            <Input
                ref={input}
                aria-label="Search operations"
                placeholder="Search by operation kind or resource name"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
            />
            {search !== '' && (
                <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Clear Search operations"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                        setSearch('');
                        input.current?.focus({ preventScroll: true });
                    }}
                >
                    <X aria-hidden="true" />
                </Button>
            )}
        </Stack>
    );

    const [operations] = useApi(`/api/v1/operations${suffix}`, zPageOperationResponse);

    const [metadata, selectMetadata] = useMetadata(operations.items);

    const columns: ColumnDef<DataGridFeatures, OperationResponse>[] = [
        {
            accessorKey: 'kind',
            header: 'Operation',
            cell: ({ row: { original: operation } }) => (
                <Stack gap={0} align="start">
                    <Text>{kinds[operation.kind]}</Text>
                    <Stack direction="horizontal" gap={1} align="center" wrap="wrap">
                        <Badge variant={operation.status === 'failed' ? 'destructive' : 'secondary'}>
                            {statuses[operation.status]}
                        </Badge>
                        {operation.finished_at && <Timestamp value={operation.finished_at} format="date_time" />}
                    </Stack>
                </Stack>
            )
        },
        {
            accessorKey: 'resource_name',
            header: 'Resource',
            cell: ({ row: { original: operation } }) => (
                <Stack direction="horizontal" gap={3} align="center">
                    {operation.kind.startsWith('solution.') ? (
                        <Boxes className="size-8 shrink-0 text-muted-foreground" aria-hidden="true" />
                    ) : (
                        <Avatar
                            shape="rounded"
                            name={operation.resource_name ?? operation.target_id}
                            aria-hidden="true"
                        />
                    )}
                    <Stack gap={0} align="start">
                        <Text>{operation.resource_name ?? 'Resource unavailable'}</Text>
                        <Text size="xs" tone="muted">
                            {operation.kind.startsWith('solution.') ? 'Solution' : 'Organization'}
                        </Text>
                    </Stack>
                </Stack>
            )
        },
        {
            id: 'actions',
            header: () => <Text align="end">Actions</Text>,
            cell: ({ row }) => (
                <Stack align="end">
                    <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Metadata"
                        onClick={() => selectMetadata(row.original.id)}
                    >
                        <Info aria-hidden="true" />
                    </Button>
                </Stack>
            )
        }
    ];

    const table = useTable({
        features: dataGridFeatures,
        data: operations.items,
        columns,
        getRowId: (operation) => operation.id,
        manualPagination: true,
        rowCount: operations.total,
        state: { pagination },
        onPaginationChange: setPagination,
        enableSorting: false
    });

    return (
        <Stack gap={2}>
            <title>Operations | LongLink</title>
            <Heading level={1}>Operations</Heading>
            <DataGrid
                table={table}
                tableLayout={{ dense: true, headerBackground: false, rowBorder: true }}
                emptyMessage="No data"
            >
                <Frame
                    variant="ghost"
                    dense
                    spacing="sm"
                    padding="none"
                    action={searchField}
                    footer={<DataGridPagination sizes={[25]} />}
                >
                    <DataGridScrollArea orientation="horizontal">
                        <DataGridTable />
                    </DataGridScrollArea>
                </Frame>
            </DataGrid>
            {metadata && (
                <Dialog
                    open
                    onOpenChange={(open) => {
                        if (!open) selectMetadata(null);
                    }}
                    title="Operation metadata"
                >
                    <Stack gap={2}>
                        <Text>
                            <b>Operation</b> {metadata.kind}
                        </Text>
                        <Text>
                            <b>Status</b>{' '}
                            <Badge variant={metadata.status === 'failed' ? 'destructive' : 'secondary'}>
                                {metadata.status}
                            </Badge>
                        </Text>
                        <Text>
                            <b>ID</b> {metadata.id}
                        </Text>
                        <Text>
                            <b>Target</b> {metadata.target_id}
                        </Text>
                        <Text>
                            <b>Created</b> <Timestamp value={metadata.created_at} format="date_time" />
                        </Text>
                        {metadata.finished_at && (
                            <Text>
                                <b>Finished</b> <Timestamp value={metadata.finished_at} format="date_time" />
                            </Text>
                        )}
                        {metadata.failed && (
                            <Text>
                                <b>Reason</b> {metadata.failed}
                            </Text>
                        )}
                    </Stack>
                </Dialog>
            )}
        </Stack>
    );
}
