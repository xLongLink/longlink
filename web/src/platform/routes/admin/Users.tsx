import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Banner } from '@astryxdesign/core/Banner';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Heading } from '@astryxdesign/core/Heading';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { pixel, proportional } from '@astryxdesign/core/Table';
import type { UserSummary } from '@/lib/generated/platform-api-v1/types.gen';
import { useToast } from '@/hooks/use-toast';
import { useApiQuery } from '@/hooks/use-api';
import { usePaginate } from '@/hooks/pagination';
import { Table, TableColumn } from '@/components/ui/Table';
import { platformApiPath } from '@/lib/platform-api';
import { zUserSummary } from '@/lib/generated/platform-api-v1/zod.gen';

/** Renders the admin users page. */
export default function AdminUsers() {
    const toast = useToast();
    const {
        data: users = [],
        error,
        isLoading,
    } = useApiQuery<UserSummary[]>(platformApiPath('/users'), {
        parse: (value) => zUserSummary.array().parse(value),
    });
    const { pageItems, pagination } = usePaginate(users);
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
                    data={pageItems}
                    density="compact"
                    emptyState={<EmptyState title="No results." isCompact />}
                    hasHover
                    idKey="id"
                    plugins={{ pagination }}
                >
                    <TableColumn<UserSummary> field="user" header="User" width={proportional(1)}>
                        {(user) => (
                            <HStack gap={3} align="center">
                                <Avatar src={user.avatar} name={user.name} size="md" />
                                <VStack gap={1}>
                                    <Text weight="semibold">{user.name}</Text>
                                    <Text type="supporting">{user.email}</Text>
                                </VStack>
                            </HStack>
                        )}
                    </TableColumn>
                    <TableColumn<UserSummary> field="id" header="ID" width={pixel(288)}>
                        {(user) => <Text type="code">{user.id}</Text>}
                    </TableColumn>
                    <TableColumn<UserSummary> field="role" header="Role" width={pixel(128)}>
                        {(user) => <Badge label={user.role} />}
                    </TableColumn>
                    <TableColumn<UserSummary> align="end" field="actions" header="Action" width={pixel(96)}>
                        {(user) => (
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
                        )}
                    </TableColumn>
                </Table>
            )}
        </VStack>
    );
}
