import { Search } from 'lucide-react';
import { useAdminList } from './use-list';
import { useApi } from '@/lib/hooks/use-api';
import { Avatar } from '@/components/ui/Avatar';
import { TextInput } from '@/components/ui/TextInput';
import { Timestamp } from '@/components/ui/Timestamp';
import { Pagination } from '@/components/ui/Pagination';
import { NativeText as Text } from '@/components/ui/NativeText';
import { NativeStack as Stack } from '@/components/ui/NativeStack';
import { NativeHeading as Heading } from '@/components/ui/NativeHeading';
import { zPageAdminUserSummary } from '@/lib/generated/platform-api-v1/zod.gen';
import { NativeTable as Table, proportional } from '@/components/ui/NativeTable';

/** Lists Platform users with server-side pagination. */
export default function Users() {
    const { search, pagination, suffix } = useAdminList();

    const [users] = useApi(`/api/v1/users${suffix}`, zPageAdminUserSummary);

    return (
        <Stack gap={2}>
            <title>Users | LongLink</title>
            <Heading level={1}>Users</Heading>
            <TextInput label="Search users" placeholder="Search by name or email" {...search} startIcon={<Search />} />
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
                                        Created: <Timestamp value={row.created_at} format="date_time" />
                                    </Text>
                                    <Text type="supporting">ID: {row.id}</Text>
                                </Stack>
                            ),
                        },
                    ]}
                />
                <Stack as="footer" align="center" paddingBlock={2}>
                    <Pagination {...pagination} totalItems={users.total} />
                </Stack>
            </Stack>
        </Stack>
    );
}
