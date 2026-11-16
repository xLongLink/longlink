import { useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useAdminList } from './use-list';
import { useApi } from '@/lib/hooks/use-api';
import { Avatar } from '@/components/longlink/display/avatar';
import { Field, FieldLabel } from '@/components/shadcn/field';
import { Timestamp } from '@/components/longlink/display/timestamp';
import { Pagination } from '@/components/longlink/action/pagination';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { zPageAdminUserSummary } from '@/lib/generated/platform-api-v1/zod.gen';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/shadcn/input-group';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/longlink/display/table';

/** Lists Platform users with server-side pagination. */
export default function Users() {
    const { search, pagination, suffix } = useAdminList();
    const searchInput = useRef<HTMLInputElement>(null);

    const [users] = useApi(`/api/v1/users${suffix}`, zPageAdminUserSummary);

    return (
        <Stack gap={2}>
            <title>Users | LongLink</title>
            <h1 className="font-semibold tracking-tight text-4xl">Users</h1>
            <Field>
                <FieldLabel htmlFor="search-users">Search users</FieldLabel>
                <InputGroup>
                    <InputGroupInput
                        ref={searchInput}
                        id="search-users"
                        placeholder="Search by name or email"
                        value={search.value}
                        onChange={(event) => search.onChange(event.target.value)}
                    />
                    <InputGroupAddon aria-hidden="true">
                        <Search />
                    </InputGroupAddon>
                    {search.value !== '' && (
                        <InputGroupAddon align="inline-end">
                            <InputGroupButton
                                size="icon-xs"
                                aria-label="Clear Search users"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                    search.onChange('');
                                    searchInput.current?.focus({ preventScroll: true });
                                }}
                            >
                                <X aria-hidden="true" />
                            </InputGroupButton>
                        </InputGroupAddon>
                    )}
                </InputGroup>
            </Field>
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
                                        <Stack align="start">
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
                                    <Stack align="start">
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
