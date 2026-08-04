import { Avatar } from '@astryxdesign/core/Avatar';
import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { useTranslator } from '@astryxdesign/core/i18n';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Table, type TableColumn, pixel, proportional } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useCollectionQuery } from '@/hooks/use-collection-query';
import { useToast } from '@/hooks/use-toast';
import type { UserSummary } from '@/lib/generated/platform-api-v1/types.gen';
import { zUserSummary } from '@/lib/generated/platform-api-v1/zod.gen';
import { platformApiPath } from '@/lib/platform-api';
import { useAdminPagination } from '@/platform/admin/pagination';

/** Renders the admin users page. */
export default function AdminUsers() {
    const t = useTranslator();
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
            header: t('columns.user'),
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
                            onClick: async () => {
                                try {
                                    await navigator.clipboard.writeText(user.email);
                                    toast({ body: t('admin.emailCopied') });
                                } catch {
                                    toast({ body: t('toasts.copyFailed'), type: 'error' });
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
                <Heading level={1}>{t('admin.usersTitle')}</Heading>
                <Text type="supporting">{t('admin.usersDescription')}</Text>
            </VStack>
            {isLoading && users.length === 0 ? null : error && users.length === 0 ? (
                <Banner status="error" title={error.message} />
            ) : (
                <Table
                    columns={columns}
                    data={pageItems}
                    density="compact"
                    emptyState={<EmptyState title={t('common.noResults')} isCompact />}
                    hasHover
                    idKey="id"
                    plugins={{ pagination }}
                />
            )}
        </VStack>
    );
}
