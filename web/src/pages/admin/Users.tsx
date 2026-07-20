import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { Avatar } from '@astryxdesign/core/Avatar';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { useToast } from '@astryxdesign/core/Toast';
import { Heading } from '@astryxdesign/core/Heading';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { pixel, proportional } from '@astryxdesign/core/Table';
import type { ApiUserListItem } from '@/lib/types';
import { useUsers } from '@/data/admin';
import { useTranslation } from '@/lib/i18n';
import { DataTable, type DataTableColumn } from '@/components/DataTable';

/** Renders the admin users page. */
export default function AdminUsers() {
    const { t } = useTranslation();
    const toast = useToast();
    const { items: users, error, isLoading } = useUsers();
    const columns: DataTableColumn<ApiUserListItem>[] = [
        {
            key: 'user',
            header: t('columns.user'),
            width: proportional(1),
            renderCell: (user) => (
                <HStack gap={3} align="center">
                    <Avatar src={user.avatar} name={user.name} size="small" />
                    <VStack gap={1}>
                        <Text weight="semibold">{user.name}</Text>
                        <Text type="supporting">{user.email}</Text>
                    </VStack>
                </HStack>
            ),
        },
        {
            key: 'id',
            header: t('columns.id'),
            width: pixel(288),
            renderCell: (user) => <Text type="code">{user.id}</Text>,
        },
        {
            key: 'role',
            header: t('columns.role'),
            width: pixel(128),
            renderCell: (user) => <Badge label={user.role} />,
        },
        {
            key: 'actions',
            header: t('columns.action'),
            width: pixel(96),
            align: 'end',
            renderCell: (user) => (
                <MoreMenu
                    label={t('common.openActionsFor', { name: user.name })}
                    size="sm"
                    items={[
                        {
                            label: t('admin.copyEmail'),
                            onClick: () => {
                                void navigator.clipboard.writeText(user.email);
                                toast({ body: t('admin.emailCopied') });
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
                <Heading level={1}>{t('admin.usersTitle')}</Heading>
                <Text type="supporting">{t('admin.usersDescription')}</Text>
            </VStack>
            <DataTable columns={columns} data={users} error={error} isLoading={isLoading} pageSize={25} />
        </VStack>
    );
}
