import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Banner } from '@astryxdesign/core/Banner';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Heading } from '@astryxdesign/core/Heading';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Table, type TableColumn, pixel, proportional } from '@astryxdesign/core/Table';
import type { UserSummary } from '@/lib/generated/platform-api-v1/types.gen';
import { useToast } from '@/hooks/use-toast';
import { platformApiPath } from '@/lib/platform-api';
import { useAdminPagination } from '@/platform/admin/pagination';
import { useCollectionQuery } from '@/hooks/use-collection-query';
import { zUserSummary } from '@/lib/generated/platform-api-v1/zod.gen';

/** Renders the admin users page. */
export default function AdminUsers() {
    const toast = useToast();
    const {
        items: users,
        error,
        isLoading,
    } = useCollectionQuery<UserSummary>(platformApiPath('/users'), {
        parse: (value) => zUserSummary.array().parse(value),
    });
    const { pageItems, pagination } = useAdminPagination(users);
    const columns: TableColumn<UserSummary>[] = [
        {
            key: 'user',
            header: 'User',
            width: proportional(1),
            renderCell: (user) => (
                <HStack gap={3} align="center">
                    <Avatar src={user.avatar} name={user.name} size="md" />
                    <VStack gap={1}>
                        <Text weight="semibold">{user.name}</Text>
                        <Text type="supporting">{user.email}</Text>
                    </VStack>
                </HStack>
            ),
        },
        {
            key: 'id',
            header: 'ID',
            width: pixel(288),
            renderCell: (user) => <Text type="code">{user.id}</Text>,
        },
        {
            key: 'role',
            header: 'Role',
            width: pixel(128),
            renderCell: (user) => <Badge label={user.role} />,
        },
        {
            key: 'actions',
            header: 'Action',
            width: pixel(96),
            align: 'end',
            renderCell: (user) => (
                <MoreMenu
                    label={`Open actions for ${user.name}`}
                    size="sm"
                    items={[
                        {
                            label: 'Copy email',
                            onClick: async () => {
                                try {
                                    await navigator.clipboard.writeText(user.email);
                                    toast({ body: 'Email copied' });
                                } catch {
                                    toast({ body: 'Failed to copy to clipboard', type: 'error' });
                                }
                            },
                        },
                    ]}
                />
            ),
        },
    ];

    return (
        <VStack gap={6} width="100%">
            <VStack gap={1}>
                <Heading level={1}>Users</Heading>
                <Text type="supporting">Review account access, elevated users, and admin onboarding.</Text>
            </VStack>
            {isLoading && users.length === 0 ? null : error && users.length === 0 ? (
                <Banner status="error" title={error.message} />
            ) : (
                <Table
                    columns={columns}
                    data={pageItems}
                    density="compact"
                    emptyState={<EmptyState title="No results." isCompact />}
                    hasHover
                    idKey="id"
                    plugins={{ pagination }}
                />
            )}
        </VStack>
    );
}
