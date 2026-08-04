import { Avatar } from '@astryxdesign/core/Avatar';
import { Banner } from '@astryxdesign/core/Banner';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { useTranslator } from '@astryxdesign/core/i18n';
import { Link } from '@astryxdesign/core/Link';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Table, type TableColumn, pixel, proportional } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy } from 'lucide-react';
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';
import { useCollectionQuery } from '@/hooks/use-collection-query';
import { useToast } from '@/hooks/use-toast';
import { fetchApiVoid } from '@/lib/api';
import type { OrganizationSummary } from '@/lib/generated/platform-api-v1/types.gen';
import { zOrganizationSummary } from '@/lib/generated/platform-api-v1/zod.gen';
import { platformApiPath } from '@/lib/platform-api';
import { organizationsQueryKey } from '@/lib/query-keys';
import { useDeleteDialog } from '@/lib/utils';
import { useAdminPagination } from '@/platform/admin/pagination';

/** Renders the admin organizations page. */
export default function AdminOrganizations() {
    const t = useTranslator();
    const toast = useToast();
    const queryClient = useQueryClient();
    const deleteOrganization = useMutation({
        mutationFn: (organizationId: string) =>
            fetchApiVoid(platformApiPath(`/organizations/${organizationId}`), { method: 'DELETE' }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: organizationsQueryKey });
            toast({ body: t('admin.organizationDeleted') });
        },
    });
    const {
        items: organizations,
        error,
        isLoading,
    } = useCollectionQuery<OrganizationSummary>(platformApiPath('/organizations'), {
        parse: (value) => zOrganizationSummary.array().parse(value),
    });
    const { pageItems, pagination } = useAdminPagination(organizations);
    const deleteDialog = useDeleteDialog({
        title: t('deleteDialog.deleteOrganizationTitle'),
        mutation: deleteOrganization,
        items: organizations,
        getId: (organization) => organization.id,
        description: (organization) => t('admin.deleteOrganizationDescription', { name: organization.name }),
        errorMessage: t('deleteDialog.failedDeleteOrganization'),
        fallbackDescription: t('deleteDialog.deleteOrganizationFallback'),
        onError: (message) => toast({ body: message, type: 'error' }),
    });
    const columns: TableColumn<OrganizationSummary>[] = [
        {
            key: 'name',
            header: t('columns.name'),
            width: proportional(1),
            renderCell: (organization) => (
                <HStack gap={3} align="center">
                    <Avatar src={organization.avatar ?? undefined} name={organization.name} size="md" />
                    <Link href={`/orgs/${organization.slug}`} weight="semibold">
                        {organization.name}
                    </Link>
                </HStack>
            ),
        },
        {
            key: 'actions',
            header: t('columns.action'),
            width: pixel(96),
            align: 'end',
            renderCell: (organization) => (
                <MoreMenu
                    label={t('common.openActionsFor', { name: organization.name })}
                    size="sm"
                    items={[
                        {
                            label: `${t('actions.copy')} ${t('admin.organizationName').toLowerCase()}`,
                            icon: <Copy size={16} />,
                            onClick: async () => {
                                try {
                                    await navigator.clipboard.writeText(organization.name);
                                    toast({ body: `${t('admin.organizationName')}: ${t('actions.copied')}` });
                                } catch {
                                    toast({ body: t('toasts.copyFailed'), type: 'error' });
                                }
                            },
                        },
                        { label: t('actions.delete'), onClick: () => deleteDialog.openFor(organization) },
                    ]}
                />
            ),
        },
    ];

    return (
        <VStack gap={6} width="100%">
            <VStack gap={1}>
                <Heading level={1}>{t('admin.organizationsTitle')}</Heading>
                <Text type="supporting">{t('admin.organizationsDescription')}</Text>
            </VStack>
            {isLoading && organizations.length === 0 ? null : error && organizations.length === 0 ? (
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
            <DeleteConfirmation {...deleteDialog.dialogProps} />
        </VStack>
    );
}
