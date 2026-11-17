import { useAdminList } from './use-list';
import { useApi } from '@/lib/hooks/use-api';
import { Stack } from '@/components/longlink/layout/stack';
import { Avatar } from '@/components/longlink/display/avatar';
import { AdminSearch } from '@/components/custom/admin-search';
import { Timestamp } from '@/components/longlink/display/timestamp';
import { Pagination } from '@/components/longlink/action/pagination';
import { zPageAdminUserSummary } from '@/lib/generated/platform-api-v1/zod.gen';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/longlink/display/table';

/** Lists Platform users with server-side pagination. */
export default function Users() {
    const { search, pagination, suffix } = useAdminList();

    const [users] = useApi(`/api/v1/users${suffix}`, zPageAdminUserSummary);

    return (
        <Stack gap={2}>
            <title>Users | LongLink</title>
            <h1 className="font-semibold tracking-tight text-4xl">Users</h1>
            <AdminSearch id="search-users" label="Search users" placeholder="Search by name or email" {...search} />
            <Stack gap={1}>
                <Table wrap>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Metadata</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.items.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell>
                                    <Stack direction="horizontal" gap={3} align="center">
                                        <Avatar name={row.name} src={row.avatar} />
                                        <Stack gap={0} align="start">
                                            <Stack direction="horizontal" gap={1} align="center">
                                                <span>{row.name}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {row.administrator ? 'Administrator' : 'User'}
                                                </span>
                                            </Stack>
                                            <span className="text-xs text-muted-foreground">{row.email}</span>
                                        </Stack>
                                    </Stack>
                                </TableCell>
                                <TableCell>
                                    <Stack gap={0} align="start">
                                        <span>
                                            Created: <Timestamp value={row.created_at} format="date_time" />
                                        </span>
                                        <span className="text-xs text-muted-foreground">ID: {row.id}</span>
                                    </Stack>
                                </TableCell>
                            </TableRow>
                        ))}
                        {users.items.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={2} align="center">
                                    <Empty role="status" title="No data" />
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                <footer className="flex flex-col items-center py-2">
                    <Pagination {...pagination} totalItems={users.total} />
                </footer>
            </Stack>
        </Stack>
    );
}
import { Empty } from '@/components/longlink/display/empty';
