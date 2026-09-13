import { useState } from 'react';
import { Ellipsis } from 'lucide-react';
import { NoIndex } from '@/components/Seo';
import { UserCell } from '@/components/Cells';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { Stack } from '@astryxdesign/core/Stack';
import { usePaginate } from '@/lib/hooks/pagination';
import { Heading } from '@astryxdesign/core/Heading';
import MetadataDialog from '@/components/dialogs/Metadata';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { IconButton } from '@astryxdesign/core/IconButton';
import { PageError, PageLoading } from '@/components/Utils';
import { Table, type TableColumn, pixel } from '@astryxdesign/core/Table';
import { zPageUserSummary } from '@/lib/generated/platform-api-v1/zod.gen';
import type { UserSummary } from '@/lib/generated/platform-api-v1/types.gen';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';

/** Renders the admin users page. */
export default function AdminUsers() {
    const [metadataUser, setMetadataUser] = useState<UserSummary | null>(null);
    const { items: users, error, isLoading, pagination } = usePaginate('/api/v1/users', zPageUserSummary);
    const pageMetadata = <NoIndex title="Users | LongLink" />;

    if (isLoading) {
        return (
            <>
                {pageMetadata}
                <PageLoading label="Loading users" />
            </>
        );
    }

    if (error && users.length === 0) {
        return (
            <>
                {pageMetadata}
                <PageError description="We couldn't load the platform users." title="Unable to load users" />
            </>
        );
    }

    return (
        <Stack gap={8}>
            {pageMetadata}
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
                columns={
                    [
                        {
                            key: 'user',
                            header: 'User',
                            width: pixel(400),
                            renderCell: (user) => (
                                <UserCell
                                    endContent={<Badge label={user.administrator ? 'Administrator' : 'User'} />}
                                    user={user}
                                />
                            ),
                        },
                        {
                            align: 'end',
                            key: 'actions',
                            header: '',
                            width: pixel(56),
                            renderCell: (user) => (
                                <IconButton
                                    icon={<Ellipsis />}
                                    label={`View metadata for ${user.name}`}
                                    size="sm"
                                    tooltip="View metadata"
                                    variant="ghost"
                                    onClick={() => setMetadataUser(user)}
                                />
                            ),
                        },
                    ] satisfies TableColumn<UserSummary>[]
                }
            />
            {metadataUser && (
                <MetadataDialog onClose={() => setMetadataUser(null)} title="User metadata">
                    <MetadataList>
                        <MetadataListItem label="Email">{metadataUser.email}</MetadataListItem>
                        <MetadataListItem label="Access">
                            <Badge label={metadataUser.administrator ? 'Administrator' : 'User'} />
                        </MetadataListItem>
                        <MetadataListItem label="ID">{metadataUser.id}</MetadataListItem>
                    </MetadataList>
                </MetadataDialog>
            )}
        </Stack>
    );
}
