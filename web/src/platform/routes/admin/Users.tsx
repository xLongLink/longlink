import type { z } from 'zod';
import { useState } from 'react';
import { useApi } from '@/lib/hooks/use-api';
import { NoIndex } from '@/components/NoIndex';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@astryxdesign/core/Badge';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Timestamp } from '@astryxdesign/core/Timestamp';
import { Pagination } from '@astryxdesign/core/Pagination';
import { Table, proportional } from '@astryxdesign/core/Table';
import type { zPageAdminUserSummary } from '@/lib/generated/platform-api-v1/zod.gen';

/** Lists Platform users with server-side pagination. */
export default function Users() {
    const [page, setPage] = useState(1);
    const [users] = useApi<z.output<typeof zPageAdminUserSummary>>(`/api/v1/users?page=${page}&page_size=25`);

    return (
        <Stack gap={4}>
            <NoIndex title="Users | LongLink" />
            <Heading level={1}>Users</Heading>
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
                                    <Avatar name={row.name} src={row.avatar} />
                                    <Stack align="start">
                                        <Stack direction="horizontal" gap={1} align="center">
                                            <Text>{row.name}</Text>
                                            <Badge label={row.administrator ? 'Administrator' : 'User'} />
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
                <Pagination page={page} onChange={setPage} totalItems={users.total} pageSize={25} variant="none" />
            </Stack>
        </Stack>
    );
}
