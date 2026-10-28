import { Search } from 'lucide-react';
import { useApi } from '@/lib/hooks/use-api';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Stack } from '@astryxdesign/core/Stack';
import { useDeferredValue, useState } from 'react';
import { Heading } from '@astryxdesign/core/Heading';
import { TextInput } from '@/components/ui/TextInput';
import { Timestamp } from '@astryxdesign/core/Timestamp';
import { Pagination } from '@astryxdesign/core/Pagination';
import { Table, proportional } from '@astryxdesign/core/Table';
import { zPageAdminUserSummary } from '@/lib/generated/platform-api-v1/zod.gen';

/** Lists Platform users with server-side pagination. */
export default function Users() {
    // Defer list requests so typing remains responsive while a new page loads.
    const [filters, setFilters] = useState({ search: '', page: 1 });
    const { search, page } = useDeferredValue(filters);

    const [users] = useApi(
        `/api/v1/users?page=${page}&page_size=25&search=${encodeURIComponent(search.trim())}`,
        zPageAdminUserSummary
    );

    return (
        <Stack gap={2}>
            <title>Users | LongLink</title>
            <Heading level={1}>Users</Heading>
            <TextInput
                label="Search users"
                placeholder="Search by name or email"
                value={filters.search}
                startIcon={<Search />}
                onChange={(search) => setFilters({ search, page: 1 })}
            />
            <Stack gap={1}>
                <Table
                    data={users.items}
                    idKey="id"
                    hasHover
                    density="compact"
                    columns={[
                        {
                            key: 'name',
                            header: 'User',
                            width: proportional(1),
                            renderCell: (row) => (
                                <Stack direction="horizontal" gap={3} align="center">
                                    <Avatar name={row.name} src={row.avatar} seed={row.id} />
                                    <Stack align="start">
                                        <Stack direction="horizontal" gap={1} align="center">
                                            <Text>{row.name}</Text>
                                            <Text type="supporting">
                                                {row.administrator ? 'Administrator' : 'User'}
                                            </Text>
                                        </Stack>
                                        <Text type="supporting">{row.email}</Text>
                                    </Stack>
                                </Stack>
                            ),
                        },
                        {
                            key: 'id',
                            header: 'Metadata',
                            width: proportional(1),
                            renderCell: (row) => (
                                <Stack align="start">
                                    <Text>
                                        Created: <Timestamp value={row.created_at} />
                                    </Text>
                                    <Text type="supporting">ID: {row.id}</Text>
                                </Stack>
                            ),
                        },
                    ]}
                />
                <Stack as="footer" align="center" paddingBlock={2}>
                    <Pagination
                        page={page}
                        onChange={(page) => setFilters({ ...filters, page })}
                        totalItems={users.total}
                        pageSize={25}
                        variant="pages"
                    />
                </Stack>
            </Stack>
        </Stack>
    );
}
