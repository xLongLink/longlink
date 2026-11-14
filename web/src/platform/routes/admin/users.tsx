import { Search } from 'lucide-react';
import { useAdminList } from './use-list';
import { useApi } from '@/lib/hooks/use-api';
import { Timestamp } from '@/components/custom/timestamp';
import { TextInput } from '@/components/custom/text-input';
import { DataPagination } from '@/components/custom/data-pagination';
import { NativeText as Text } from '@/components/custom/native-text';
import { GeneratedAvatar } from '@/components/custom/generated-avatar';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { DataTable, proportional } from '@/components/custom/data-table';
import { NativeHeading as Heading } from '@/components/custom/native-heading';
import { zPageAdminUserSummary } from '@/lib/generated/platform-api-v1/zod.gen';

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
                <DataTable
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
                                    <GeneratedAvatar name={row.name} src={row.avatar} seed={row.id} />
                                    <Stack align="start">
                                        <Stack direction="horizontal" gap={1} align="center">
                                            <Text>{row.name}</Text>
                                            <Text className="text-xs text-muted-foreground">
                                                {row.administrator ? 'Administrator' : 'User'}
                                            </Text>
                                        </Stack>
                                        <Text className="text-xs text-muted-foreground">{row.email}</Text>
                                    </Stack>
                                </Stack>
                            )
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
                                    <Text className="text-xs text-muted-foreground">ID: {row.id}</Text>
                                </Stack>
                            )
                        }
                    ]}
                />
                <Stack as="footer" align="center" paddingBlock={2}>
                    <DataPagination {...pagination} totalItems={users.total} />
                </Stack>
            </Stack>
        </Stack>
    );
}
