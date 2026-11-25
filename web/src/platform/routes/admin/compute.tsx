import type { z } from 'zod';
import { api } from '@/lib/api';
import { Info, X } from 'lucide-react';
import { useApi } from '@/lib/hooks/use-api';
import { Input } from '@/components/longlink/form/input';
import { useSelection } from '@/lib/hooks/use-selection';
import { Text } from '@/components/longlink/display/text';
import { Stack } from '@/components/longlink/layout/stack';
import { useDeferredValue, useRef, useState } from 'react';
import { Button } from '@/components/longlink/action/button';
import { Dialog } from '@/components/longlink/layout/dialog';
import { Heading } from '@/components/longlink/display/heading';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { useConfirm } from '@/components/longlink/hooks/use-confirm';
import { ComputeRegistration } from '@/platform/routes/admin/dialogs/compute-registration';
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

type ComputeRegistryResponse = z.infer<typeof schemas.zComputeRegistryResponse>;

/** Lists registered Compute infrastructure and manages registration and removal. */
export default function Compute() {
    const [filters, setFilters] = useState({ search: '', pagination: { pageIndex: 0, pageSize: 25 } });
    const { search, pagination } = useDeferredValue(filters);
    const input = useRef<HTMLInputElement>(null);
    const suffix = `?page=${pagination.pageIndex + 1}&page_size=25&search=${encodeURIComponent(search.trim())}`;
    const searchField = (
        <Stack direction="horizontal" gap={1} align="center">
            <Input
                ref={input}
                aria-label="Search compute"
                placeholder="Search by name or endpoint"
                value={filters.search}
                onChange={(event) =>
                    setFilters({ search: event.target.value, pagination: { pageIndex: 0, pageSize: 25 } })
                }
            />
            {filters.search !== '' && (
                <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Clear Search compute"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                        setFilters({ search: '', pagination: { pageIndex: 0, pageSize: 25 } });
                        input.current?.focus({ preventScroll: true });
                    }}
                >
                    <X aria-hidden="true" />
                </Button>
            )}
        </Stack>
    );

    const [dialog, setDialog, closeDialog] = useSelection<
        { kind: 'registration' } | { kind: 'metadata'; id: string }
    >();
    const confirmation = useConfirm();

    const path = `/api/v1/computes${suffix}`;
    const [computes, invalidate] = useApi(path, schemas.zPageComputeRegistryResponse);

    // Use current metadata and clear missing selections so returning to a page cannot reopen the dialog.
    const metadata = dialog?.kind === 'metadata' ? computes.items.find((item) => item.id === dialog.id) : undefined;

    if (dialog?.kind === 'metadata' && !metadata) setDialog(null);

    const columns: ColumnDef<DataGridFeatures, ComputeRegistryResponse>[] = [
        {
            accessorKey: 'name',
            header: 'Compute',
            cell: ({ row: { original: compute } }) => (
                <Stack gap={0} align="start">
                    <Text>{compute.name}</Text>
                    <Text size="xs" tone="muted">
                        {compute.gateway_url}
                    </Text>
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
                        onClick={() => setDialog({ kind: 'metadata', id: row.original.id })}
                    >
                        <Info aria-hidden="true" />
                    </Button>
                </Stack>
            )
        }
    ];

    const table = useTable({
        features: dataGridFeatures,
        data: computes.items,
        columns,
        getRowId: (compute) => compute.id,
        manualPagination: true,
        rowCount: computes.total,
        state: { pagination: filters.pagination },
        onPaginationChange: (updater) =>
            setFilters((current) => ({
                ...current,
                pagination: typeof updater === 'function' ? updater(current.pagination) : updater
            })),
        enableSorting: false
    });

    return (
        <Stack gap={2}>
            <title>Compute | LongLink</title>
            <Stack gap={0} direction="horizontal" justify="between" align="center" wrap="wrap">
                <Heading level={1}>Compute</Heading>
                <Button onClick={() => setDialog({ kind: 'registration' })}>Register Compute</Button>
            </Stack>
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
            {dialog?.kind === 'registration' && (
                <ComputeRegistration
                    onSuccess={async () => {
                        // Refresh the list before closing only this registration attempt.
                        await invalidate();
                        closeDialog();
                    }}
                    onClose={closeDialog}
                />
            )}
            {metadata && (
                <Dialog
                    open
                    onOpenChange={(open) => {
                        if (!open) closeDialog();
                    }}
                    title="Compute metadata"
                    footer={
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => {
                                closeDialog();
                                confirmation.show({
                                    title: 'Delete compute',
                                    description: `Remove compute ${metadata.name} from the LongLink Platform? Its Kubernetes resources will remain unchanged.`,
                                    actionLabel: 'Delete',
                                    actionVariant: 'destructive',
                                    onAction: async () => {
                                        await api.delete(`/api/v1/computes/${metadata.id}`);
                                        await invalidate();
                                    }
                                });
                            }}
                        >
                            Delete
                        </Button>
                    }
                >
                    <Stack gap={2}>
                        <Text>
                            <b>Gateway</b> {metadata.gateway_url}
                        </Text>
                        <Text>
                            <b>Database storage class</b> {metadata.database_storage_class}
                        </Text>
                        <Text>
                            <b>ID</b> {metadata.id}
                        </Text>
                        <Text>
                            <b>Storage endpoint</b> {metadata.storage_endpoint}
                        </Text>
                    </Stack>
                </Dialog>
            )}
            {confirmation.element}
        </Stack>
    );
}
