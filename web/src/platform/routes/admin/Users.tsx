import { Text } from '@astryxdesign/core/Text';
import { useToast } from '@/lib/hooks/use-toast';
import { Badge } from '@astryxdesign/core/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { usePaginate } from '@/lib/hooks/pagination';
import { Heading } from '@astryxdesign/core/Heading';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Table, TableColumn } from '@/components/ui/Table';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { PageError, PageLoading } from '@/components/Utils';
import { pixel, proportional } from '@astryxdesign/core/Table';
import { zPageUserSummary } from '@/lib/generated/platform-api-v1/zod.gen';
import type { UserSummary } from '@/lib/generated/platform-api-v1/types.gen';

/** Renders the admin users page. */
export default function AdminUsers() {
    const toast = useToast();
    const { items: users, error, isLoading, pagination } = usePaginate('/api/v1/users', zPageUserSummary);

    if (isLoading && users.length === 0) {
        return <PageLoading label="Loading users" />;
    }

    if (error && users.length === 0) {
        return <PageError description="We couldn't load the platform users." title="Unable to load users" />;
    }

    return (
        <VStack gap={6} width="100%">
            <VStack gap={0}>
                <Heading level={1}>Users</Heading>
                <Text type="supporting">Review account access, elevated users, and admin onboarding.</Text>
            </VStack>
            <Table
                data={users}
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
                            <VStack>
                                <Text weight="semibold">{user.name}</Text>
                                <Text type="supporting">{user.email}</Text>
                            </VStack>
                        </HStack>
                    )}
                </TableColumn>
                <TableColumn<UserSummary> field="id" header="ID" width={pixel(288)}>
                    {(user) => <Text type="code">{user.id}</Text>}
                </TableColumn>
                <TableColumn<UserSummary> field="administrator" header="Access" width={pixel(128)}>
                    {(user) => <Badge label={user.administrator ? 'Administrator' : 'User'} />}
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
        </VStack>
    );
}
