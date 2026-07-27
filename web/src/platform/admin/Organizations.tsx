import { Avatar } from '@astryxdesign/core/Avatar';
import { Banner } from '@astryxdesign/core/Banner';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { type TranslatorFn, useTranslator } from '@astryxdesign/core/i18n';
import { Link } from '@astryxdesign/core/Link';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Table, type TableColumn, pixel, proportional } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy } from 'lucide-react';
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';
import { useOrganizations } from '@/data/admin';
import { useToast } from '@/hooks/use-toast';
import { fetchApiVoid } from '@/lib/api';
import { organizationsQueryKey } from '@/lib/query-keys';
import type { ApiOrganizationSummary } from '@/lib/types';
import { formatDateTime, useDeleteDialog } from '@/lib/utils';
import { useAdminPagination } from '@/platform/admin/pagination';

/** Returns localized admin organization table columns. */
function createOrganizationColumns(t: TranslatorFn): TableColumn<ApiOrganizationSummary>[] {
    return [
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
            key: 'created_by',
            header: t('columns.createdBy'),
            width: pixel(256),
            renderCell: (organization) =>
                organization.created_by ? (
                    <HStack gap={3} align="center">
                        <Avatar src={organization.created_by.avatar} name={organization.created_by.name} size="md" />
                        <VStack gap={1}>
                            <Text weight="semibold">{organization.created_by.name}</Text>
                            <Text type="supporting">{formatDateTime(organization.created_at)}</Text>
                        </VStack>
                    </HStack>
                ) : (
                    '—'
                ),
        },
        {
            key: 'updated_by',
            header: t('columns.updatedBy'),
            width: pixel(256),
            renderCell: (organization) =>
                organization.updated_by ? (
                    <HStack gap={3} align="center">
                        <Avatar src={organization.updated_by.avatar} name={organization.updated_by.name} size="md" />
                        <VStack gap={1}>
                            <Text weight="semibold">{organization.updated_by.name}</Text>
                            <Text type="supporting">{formatDateTime(organization.updated_at)}</Text>
                        </VStack>
                    </HStack>
                ) : (
                    '—'
                ),
        },
        {
            key: 'deleted_by',
            header: t('columns.deletedBy'),
            width: pixel(256),
            renderCell: (organization) =>
                organization.deleted_by ? (
                    <HStack gap={3} align="center">
                        <Avatar src={organization.deleted_by.avatar} name={organization.deleted_by.name} size="md" />
                        <VStack gap={1}>
                            <Text weight="semibold">{organization.deleted_by.name}</Text>
                            <Text type="supporting">
                                {organization.deleted_at ? formatDateTime(organization.deleted_at) : '—'}
                            </Text>
                        </VStack>
                    </HStack>
                ) : (
                    '—'
                ),
        },
    ];
}

/** Renders the admin organizations page. */
export default function AdminOrganizations() {
    const t = useTranslator();
    const toast = useToast();
    const queryClient = useQueryClient();
    const deleteOrganization = useMutation({
        mutationFn: async (organizationId: string) => {
            await fetchApiVoid(`/api/organizations/${organizationId}`, { method: 'DELETE' });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: organizationsQueryKey() });
            toast({ body: t('admin.organizationDeleted') });
        },
    });
    const { items: organizations, error, isLoading } = useOrganizations();
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
    const columns: TableColumn<ApiOrganizationSummary>[] = [
        ...createOrganizationColumns(t),
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
