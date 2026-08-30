import { useState } from 'react';
import { Ellipsis } from 'lucide-react';
import { Stack } from '@/components/ui/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@astryxdesign/core/Badge';
import { pixel } from '@astryxdesign/core/Table';
import { usePaginate } from '@/lib/hooks/pagination';
import { Heading } from '@astryxdesign/core/Heading';
import MetadataDialog from '@/components/dialogs/Metadata';
import { Table, TableColumn } from '@/components/ui/Table';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { IconButton } from '@astryxdesign/core/IconButton';
import { PageError, PageLoading } from '@/components/Utils';
import { zPageUserSummary } from '@/lib/generated/platform-api-v1/zod.gen';
import type { UserSummary } from '@/lib/generated/platform-api-v1/types.gen';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';

/** Renders the admin users page. */
export default function AdminUsers() {
    const [metadataUser, setMetadataUser] = useState<UserSummary | null>(null);
    const { items: users, error, isLoading, pagination } = usePaginate('/api/v1/users', zPageUserSummary);

    if (isLoading && users.length === 0) {
        return <PageLoading label="Loading users" />;
    }

    if (error && users.length === 0) {
        return <PageError description="We couldn't load the platform users." title="Unable to load users" />;
    }

    return (
        <Stack gap={8} width="100%">
            <Stack>
                <Heading level={1}>Users</Heading>
                <Text as="p" color="secondary">
                    Review account access, elevated users, and admin onboarding.
                </Text>
            </Stack>
            <Table
                data={users}
                density="compact"
                emptyState={<EmptyState title="No results." isCompact />}
                hasHover
                idKey="id"
                plugins={{ pagination }}
            >
                <TableColumn<UserSummary> field="user" header="User" width={pixel(400)}>
                    {(user) => (
                        <Stack direction="horizontal" gap={3} align="center">
                            <Avatar src={user.avatar} name={user.name} />
                            <Stack>
                                <Stack direction="horizontal" gap={1} align="center">
                                    <Text weight="semibold">{user.name}</Text>
                                    <Badge label={user.administrator ? 'Administrator' : 'User'} />
                                </Stack>
                                <Text type="supporting">{user.email}</Text>
                            </Stack>
                        </Stack>
                    )}
                </TableColumn>
                <TableColumn<UserSummary> align="end" field="actions" header="" width={pixel(56)}>
                    {(user) => (
                        <IconButton
                            icon={<Ellipsis />}
                            label={`View metadata for ${user.name}`}
                            size="sm"
                            tooltip="View metadata"
                            variant="ghost"
                            onClick={() => setMetadataUser(user)}
                        />
                    )}
                </TableColumn>
            </Table>
            {metadataUser ? (
                <MetadataDialog onClose={() => setMetadataUser(null)} title="User metadata">
                    <MetadataList>
                        <MetadataListItem label="Email">{metadataUser.email}</MetadataListItem>
                        <MetadataListItem label="Access">
                            <Badge label={metadataUser.administrator ? 'Administrator' : 'User'} />
                        </MetadataListItem>
                        <MetadataListItem label="ID">{metadataUser.id}</MetadataListItem>
                    </MetadataList>
                </MetadataDialog>
            ) : null}
        </Stack>
    );
}
