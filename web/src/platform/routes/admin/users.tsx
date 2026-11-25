import type { z } from 'zod';
import { useRef } from 'react';
import { X } from 'lucide-react';
import { useFilters } from './use-filters';
import { useApi } from '@/lib/hooks/use-api';
import { Input } from '@/components/longlink/form/input';
import { Text } from '@/components/longlink/display/text';
import { Stack } from '@/components/longlink/layout/stack';
import { Button } from '@/components/longlink/action/button';
import { Avatar } from '@/components/longlink/display/avatar';
import { Heading } from '@/components/longlink/display/heading';
import { Timestamp } from '@/components/longlink/display/timestamp';
import { zAdminUserSummary, zPageAdminUserSummary } from '@/lib/generated/platform-api-v1/zod.gen';
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

type AdminUserSummary = z.infer<typeof zAdminUserSummary>;

/** Lists Platform users with server-side pagination. */
export default function Users() {
    const { search, pagination, suffix, setSearch, setPagination } = useFilters();
    const input = useRef<HTMLInputElement>(null);
    const searchField = (
        <Stack direction="horizontal" gap={1} align="center">
            <Input
                ref={input}
                aria-label="Search users"
                placeholder="Search by name or email"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
            />
            {search !== '' && (
                <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Clear Search users"
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

    const [users] = useApi(`/api/v1/users${suffix}`, zPageAdminUserSummary);

    const columns: ColumnDef<DataGridFeatures, AdminUserSummary>[] = [
        {
            accessorKey: 'name',
            header: 'User',
            cell: ({ row: { original: user } }) => (
                <Stack direction="horizontal" gap={3} align="center">
                    <Avatar name={user.name} src={user.avatar} />
                    <Stack gap={0} align="start">
                        <Stack direction="horizontal" gap={1} align="center">
                            <Text>{user.name}</Text>
                            <Text size="xs" tone="muted">
                                {user.administrator ? 'Administrator' : 'User'}
                            </Text>
                        </Stack>
                        <Text size="xs" tone="muted">
                            {user.email}
                        </Text>
                    </Stack>
                </Stack>
            )
        },
        {
            id: 'metadata',
            header: 'Metadata',
            cell: ({ row: { original: user } }) => (
                <Stack gap={0} align="start">
                    <Text>
                        Created: <Timestamp value={user.created_at} format="date_time" />
                    </Text>
                    <Text size="xs" tone="muted">
                        ID: {user.id}
                    </Text>
                </Stack>
            )
        }
    ];

    const table = useTable({
        features: dataGridFeatures,
        data: users.items,
        columns,
        getRowId: (user) => user.id,
        manualPagination: true,
        rowCount: users.total,
        state: { pagination },
        onPaginationChange: setPagination,
        enableSorting: false
    });

    return (
        <Stack gap={2}>
            <title>Users | LongLink</title>
            <Heading level={1}>Users</Heading>
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
        </Stack>
    );
}
