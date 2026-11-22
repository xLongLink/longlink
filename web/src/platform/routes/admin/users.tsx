import { useApi } from '@/lib/hooks/use-api';
import { useListControls } from './use-list-controls';
import { Text } from '@/components/longlink/display/text';
import { Stack } from '@/components/longlink/layout/stack';
import { Empty } from '@/components/longlink/display/empty';
import { Avatar } from '@/components/longlink/display/avatar';
import { Heading } from '@/components/longlink/display/heading';
import { Timestamp } from '@/components/longlink/display/timestamp';
import { Pagination } from '@/components/longlink/action/pagination';
import { zPageAdminUserSummary } from '@/lib/generated/platform-api-v1/zod.gen';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/longlink/display/table';

/** Lists Platform users with server-side pagination. */
export default function Users() {
    const { suffix, searchField, pagination } = useListControls('users', 'Search by name or email');

    const [users] = useApi(`/api/v1/users${suffix}`, zPageAdminUserSummary);

    return (
        <Stack gap={2}>
            <title>Users | LongLink</title>
            <Heading level={1}>Users</Heading>
            {searchField}
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
                                                <Text>{row.name}</Text>
                                                <Text size="xs" tone="muted">
                                                    {row.administrator ? 'Administrator' : 'User'}
                                                </Text>
                                            </Stack>
                                            <Text size="xs" tone="muted">
                                                {row.email}
                                            </Text>
                                        </Stack>
                                    </Stack>
                                </TableCell>
                                <TableCell>
                                    <Stack gap={0} align="start">
                                        <Text>
                                            Created: <Timestamp value={row.created_at} format="date_time" />
                                        </Text>
                                        <Text size="xs" tone="muted">
                                            ID: {row.id}
                                        </Text>
                                    </Stack>
                                </TableCell>
                            </TableRow>
                        ))}
                        {users.items.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={2} align="center">
                                    <Empty title="No data" />
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                <Stack as="footer" gap={0} align="center" paddingBlock={2}>
                    <Pagination {...pagination} totalItems={users.total} />
                </Stack>
            </Stack>
        </Stack>
    );
}
