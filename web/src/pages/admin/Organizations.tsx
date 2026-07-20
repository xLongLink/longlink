import type { TFunction } from 'i18next';
import { Icon } from '@astryxdesign/core/Icon';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@astryxdesign/core/Avatar';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { useToast } from '@astryxdesign/core/Toast';
import { Heading } from '@astryxdesign/core/Heading';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { pixel, proportional } from '@astryxdesign/core/Table';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiOrganizationSummary } from '@/lib/types';
import { fetchApiVoid } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { useOrganizations } from '@/data/admin';
import { useUserProfile } from '@/hooks/use-user';
import { organizationsQueryKey } from '@/lib/query-keys';
import { formatDateTime, useDeleteDialog } from '@/lib/utils';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';

/** Returns localized admin organization table columns. */
function createOrganizationColumns(t: TFunction): DataTableColumn<ApiOrganizationSummary>[] {
    return [
        {
            key: 'name',
            header: t('columns.name'),
            width: proportional(1),
            renderCell: (organization) => (
                <HStack gap={3} align="center">
                    <Avatar src={organization.avatar ?? undefined} name={organization.name} size="small" />
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
                        <Avatar src={organization.created_by.avatar} name={organization.created_by.name} size="small" />
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
                        <Avatar src={organization.updated_by.avatar} name={organization.updated_by.name} size="small" />
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
                        <Avatar src={organization.deleted_by.avatar} name={organization.deleted_by.name} size="small" />
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
    const { t } = useTranslation();
    const toast = useToast();
    const { role } = useUserProfile();
    const queryClient = useQueryClient();
    const canManage = role === 'administrator';
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
    const deleteDialog = useDeleteDialog({
        title: t('deleteDialog.deleteOrganizationTitle'),
        mutation: deleteOrganization,
        items: organizations,
        getId: (organization) => organization.id,
        description: (organization) => t('admin.deleteOrganizationDescription', { name: organization.name }),
        errorMessage: t('deleteDialog.failedDeleteOrganization'),
        fallbackDescription: t('deleteDialog.deleteOrganizationFallback'),
    });
    const columns = createOrganizationColumns(t);
    const organizationColumns: DataTableColumn<ApiOrganizationSummary>[] = canManage
        ? [
              ...columns,
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
                                  icon: <Icon icon="copy" size="sm" />,
                                  onClick: () => {
                                      void navigator.clipboard.writeText(organization.name);
                                      toast({ body: `${t('admin.organizationName')}: ${t('actions.copied')}` });
                                  },
                              },
                              { label: t('actions.delete'), onClick: () => deleteDialog.openFor(organization) },
                          ]}
                      />
                  ),
              },
          ]
        : columns;

    return (
        <VStack gap={6} width="100%">
            <VStack gap={1}>
                <Heading level={1}>{t('admin.organizationsTitle')}</Heading>
                <Text type="supporting">{t('admin.organizationsDescription')}</Text>
            </VStack>
            <DataTable
                columns={organizationColumns}
                data={organizations}
                error={error}
                isLoading={isLoading}
                pageSize={25}
            />
            <DeleteConfirmation {...deleteDialog.dialogProps} />
        </VStack>
    );
}
