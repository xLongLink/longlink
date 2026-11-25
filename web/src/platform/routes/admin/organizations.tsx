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
import { useConfirm } from '@/components/longlink/hooks/use-confirm';
import { zOrganizationIdentity, zPageOrganizationIdentity } from '@/lib/generated/platform-api-v1/zod.gen';
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

type OrganizationIdentity = z.infer<typeof zOrganizationIdentity>;

/** Lists organizations and confirms administrator deletion. */
export default function Organizations() {
    const [filters, setFilters] = useState({ search: '', pagination: { pageIndex: 0, pageSize: 25 } });
    const { search, pagination } = useDeferredValue(filters);
    const input = useRef<HTMLInputElement>(null);
    const suffix = `?page=${pagination.pageIndex + 1}&page_size=25&search=${encodeURIComponent(search.trim())}`;
    const searchField = (
        <Stack direction="horizontal" gap={1} align="center">
            <Input
                ref={input}
                aria-label="Search organizations"
                placeholder="Search by name"
                value={filters.search}
                onChange={(event) =>
                    setFilters({ search: event.target.value, pagination: { pageIndex: 0, pageSize: 25 } })
                }
            />
            {filters.search !== '' && (
                <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Clear Search organizations"
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

    const [organizations, invalidate] = useApi(`/api/v1/organizations${suffix}`, zPageOrganizationIdentity);

    const [metadata, selectMetadata] = useMetadata(organizations.items);

    const columns: ColumnDef<DataGridFeatures, OrganizationIdentity>[] = [
        {
            accessorKey: 'name',
            header: 'Name',
            cell: ({ row: { original: organization } }) => (
                <Stack direction="horizontal" gap={3} align="center">
                    <Avatar shape="rounded" name={organization.name} />
                    <Stack direction="horizontal" gap={1} align="center">
                        <Link href={`/orgs/${organization.id}`}>{organization.name}</Link>
                        {organization.status !== 'running' && (
                            <Badge variant={organization.status === 'creating' ? 'secondary' : 'destructive'}>
                                {organization.status === 'creating' ? 'Creating' : 'Failed'}
                            </Badge>
                        )}
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
        data: organizations.items,
        columns,
        getRowId: (organization) => organization.id,
        manualPagination: true,
        rowCount: organizations.total,
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
            <title>Organizations | LongLink</title>
            <Heading level={1}>Organizations</Heading>
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
                    title="Organization metadata"
                    footer={
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => {
                                selectMetadata(null);
                                confirmation.show({
                                    title: 'Delete organization',
                                    description: `Delete organization ${metadata.name}?`,
                                    actionLabel: 'Delete',
                                    actionVariant: 'destructive',
                                    onAction: async () => {
                                        await api.delete(`/api/v1/organizations/${metadata.id}`);
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
                            <b>ID</b> {metadata.id}
                        </Text>
                    </Stack>
                </Dialog>
            )}
            {confirmation.element}
        </Stack>
    );
}
