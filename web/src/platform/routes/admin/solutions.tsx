import type { z } from 'zod';
import { api } from '@/lib/api';
import { Info, X } from 'lucide-react';
import { useMetadata } from './use-metadata';
import { useApi } from '@/lib/hooks/use-api';
import { Link } from '@/components/longlink/action/link';
import { Input } from '@/components/longlink/form/input';
import { Text } from '@/components/longlink/display/text';
import { Stack } from '@/components/longlink/layout/stack';
import { useDeferredValue, useRef, useState } from 'react';
import { Badge } from '@/components/longlink/display/badge';
import { Button } from '@/components/longlink/action/button';
import { Dialog } from '@/components/longlink/layout/dialog';
import { Avatar } from '@/components/longlink/display/avatar';
import { Heading } from '@/components/longlink/display/heading';
import { Timestamp } from '@/components/longlink/display/timestamp';
import { useConfirm } from '@/components/longlink/hooks/use-confirm';
import { zSolutionResponse, zPageSolutionResponse } from '@/lib/generated/platform-api-v1/zod.gen';
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

type SolutionResponse = z.infer<typeof zSolutionResponse>;

/** Lists Solutions and manages administrator metadata and deletion dialogs. */
export default function Solutions() {
    const [filters, setFilters] = useState({ search: '', pagination: { pageIndex: 0, pageSize: 25 } });
    const { search, pagination } = useDeferredValue(filters);
    const input = useRef<HTMLInputElement>(null);
    const suffix = `?page=${pagination.pageIndex + 1}&page_size=25&search=${encodeURIComponent(search.trim())}`;
    const searchField = (
        <Stack direction="horizontal" gap={1} align="center">
            <Input
                ref={input}
                aria-label="Search solutions"
                placeholder="Search by name, description, or organization"
                value={filters.search}
                onChange={(event) =>
                    setFilters({ search: event.target.value, pagination: { pageIndex: 0, pageSize: 25 } })
                }
            />
            {filters.search !== '' && (
                <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Clear Search solutions"
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
    const confirmation = useConfirm();

    const [solutions, invalidate] = useApi(`/api/v1/solutions${suffix}`, zPageSolutionResponse);

    const [metadata, selectMetadata] = useMetadata(solutions.items);

    const columns: ColumnDef<DataGridFeatures, SolutionResponse>[] = [
        {
            accessorKey: 'name',
            header: 'Solution',
            cell: ({ row: { original: solution } }) => (
                <Stack gap={0} align="start">
                    <Stack direction="horizontal" gap={1} align="center">
                        <Link href={`/orgs/${solution.organization.id}/solutions/${solution.id}`}>{solution.name}</Link>
                        {solution.status !== 'running' && (
                            <Badge variant={solution.status === 'creating' ? 'secondary' : 'destructive'}>
                                {solution.status === 'creating' ? 'Creating' : 'Failed'}
                            </Badge>
                        )}
                    </Stack>
                    {solution.description && (
                        <Text size="xs" tone="muted">
                            {solution.description}
                        </Text>
                    )}
                </Stack>
            )
        },
        {
            accessorKey: 'organization',
            header: 'Organization',
            cell: ({ row: { original: solution } }) => (
                <Stack direction="horizontal" gap={3} align="center">
                    <Avatar shape="rounded" name={solution.organization.name} />
                    <Link href={`/orgs/${solution.organization.id}`}>{solution.organization.name}</Link>
                </Stack>
            )
        },
        {
            accessorKey: 'image_desired',
            header: 'Image',
            cell: ({ row: { original: solution } }) => (
                <Stack gap={0} align="start">
                    <Text>{solution.image_desired.replace(/@sha256:[a-f0-9]{5,}([a-f0-9]{4})$/, '@sha25...$1')}</Text>
                    <Text size="xs" tone="muted">
                        Revision: {solution.desired_revision_id ?? 'Not selected'}
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
        data: solutions.items,
        columns,
        getRowId: (solution) => solution.id,
        manualPagination: true,
        rowCount: solutions.total,
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
            <title>Solutions | LongLink</title>
            <Heading level={1}>Solutions</Heading>
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
                    title="Solution metadata"
                    footer={
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => {
                                selectMetadata(null);
                                confirmation.show({
                                    title: 'Delete solution',
                                    description: `Delete solution ${metadata.name}?`,
                                    actionLabel: 'Delete',
                                    actionVariant: 'destructive',
                                    onAction: async () => {
                                        await api.delete(`/api/v1/solutions/${metadata.id}`);
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
                            <b>Status</b>{' '}
                            <Badge variant={metadata.status === 'failed' ? 'destructive' : 'secondary'}>
                                {metadata.status}
                            </Badge>
                        </Text>
                        <Text>
                            <b>Organization</b> {metadata.organization.name}
                        </Text>
                        <Text>
                            <b>Desired image</b> {metadata.image_desired}
                        </Text>
                        <Text>
                            <b>Desired revision</b> {metadata.desired_revision_id ?? 'Not selected'}
                        </Text>
                        <Text>
                            <b>Last deployed revision</b> {metadata.deployed_revision_id ?? 'Never deployed'}
                        </Text>
                        <Text>
                            <b>ID</b> {metadata.id}
                        </Text>
                        {metadata.description && (
                            <Text>
                                <b>Description</b> {metadata.description}
                            </Text>
                        )}
                        <Text>
                            <b>Created</b> <Timestamp value={metadata.created_at} format="date_time" />
                        </Text>
                    </Stack>
                </Dialog>
            )}
            {confirmation.element}
        </Stack>
    );
}
