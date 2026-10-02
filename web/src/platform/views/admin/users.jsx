import { useState } from 'react';
import { useApi } from '@/lib/hooks/use-api';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@astryxdesign/core/Badge';
import { Stack } from '@astryxdesign/core/Stack';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Spinner } from '@astryxdesign/core/Spinner';
import { Timestamp } from '@astryxdesign/core/Timestamp';
import { Table, proportional } from '@astryxdesign/core/Table';
import { zPageAdminUserSummary } from '@/lib/generated/platform-api-v1/zod.gen';

/** Lists Platform users with server-side pagination. */
export default function Users() {
    const [page, setPage] = useState(1);
    const users = useApi(`/api/v1/users?page=${page}&page_size=25`, zPageAdminUserSummary);

    // Keep loading and failures distinct from an empty result.
    if (users.error) return <Banner status="error" title="Unable to load users" />;
    if (!users.data) return <Spinner label="Loading users" />;

    return (
        <Stack gap={8}>
            <Heading level={1}>Users</Heading>
            <Stack gap={1}>
                <Table
                    data={users.data.items}
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
                <Stack direction="horizontal" gap={2} justify="between">
                    <Button label="Previous" isDisabled={page === 1} onClick={() => setPage(page - 1)} />
                    <Button label="Next" isDisabled={users.data.total <= page * 25} onClick={() => setPage(page + 1)} />
                </Stack>
            </Stack>
        </Stack>
    );
}
