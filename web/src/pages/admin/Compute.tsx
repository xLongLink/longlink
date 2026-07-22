import { useState } from 'react';
import { Icon } from '@astryxdesign/core/Icon';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Banner } from '@astryxdesign/core/Banner';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { useToast } from '@astryxdesign/core/Toast';
import { Heading } from '@astryxdesign/core/Heading';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type TranslatorFn, useTranslator } from '@astryxdesign/core/i18n';
import {
    Table,
    type TableColumn,
    pixel,
    paginateData,
    proportional,
    useTablePagination,
} from '@astryxdesign/core/Table';
import type { ApiComputeRegistry } from '@/lib/types';
import { useComputes } from '@/data/compute';
import { useDeleteDialog } from '@/lib/utils';
import { useUserProfile } from '@/hooks/use-user';
import { apiQueryKey, fetchApiJson } from '@/lib/api';
import CreateCompute from '@/components/dialogs/CreateCompute';
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';
import { computesQueryKey, infrastructureOptionsQueryKey } from '@/lib/query-keys';
import { apiComputeMutationResponseSchema, parseApiResponse } from '@/lib/api-schemas';

/** Returns localized admin compute table columns. */
function createComputeColumns(t: TranslatorFn): TableColumn<ApiComputeRegistry>[] {
    return [
        {
            key: 'compute',
            header: t('admin.computeTitle'),
            width: proportional(1),
            renderCell: (compute) => (
                <HStack gap={3} align="center">
                    <Icon icon="wrench" color="accent" />
                    <VStack gap={1}>
                        <Link href={`/admin/compute/${encodeURIComponent(compute.slug)}`} weight="semibold">
                            {compute.name}
                        </Link>
                        <Text type="supporting">{compute.gateway_url ?? '—'}</Text>
                    </VStack>
                </HStack>
            ),
        },
        {
            key: 'status',
            header: t('columns.status'),
            width: pixel(128),
            renderCell: (compute) => compute.status,
        },
    ];
}

/** Renders the admin compute page. */
export default function AdminCompute() {
    const t = useTranslator();
    const toast = useToast();
    const { role } = useUserProfile();
    const queryClient = useQueryClient();
    const canManage = role === 'administrator';
    const deleteCompute = useMutation({
        mutationFn: async (computeId: string) =>
            fetchApiJson(`/api/computes/${computeId}`, { method: 'DELETE' }, (value) =>
                parseApiResponse(apiComputeMutationResponseSchema, value)
            ),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: computesQueryKey() }),
                queryClient.invalidateQueries({ queryKey: infrastructureOptionsQueryKey() }),
                queryClient.invalidateQueries({ queryKey: apiQueryKey('/api/operations') }),
            ]);
            toast({ body: t('admin.computeDeleted') });
        },
    });
    const { items: computes, error, isLoading } = useComputes();
    const [page, setPage] = useState(1);
    const pageSize = 25;
    const pageCount = Math.max(1, Math.ceil(computes.length / pageSize));
    const currentPage = Math.min(page, pageCount);
    const pagination = useTablePagination<ApiComputeRegistry>({
        page: currentPage,
        onPageChange: setPage,
        totalItems: computes.length,
        pageSize,
        label: `${t('actions.previous')} / ${t('actions.next')}`,
        size: 'sm',
    });
    const deleteDialog = useDeleteDialog({
        title: t('admin.deleteComputeTitle'),
        mutation: deleteCompute,
        items: computes,
        getId: (compute) => compute.id,
        description: (compute) => t('admin.deleteComputeDescription', { slug: compute.slug }),
        errorMessage: t('admin.failedDeleteCompute'),
        fallbackDescription: t('admin.deleteComputeFallback'),
        onError: (message) => toast({ body: message, type: 'error' }),
    });
    const columns = createComputeColumns(t);
    const computeColumns: TableColumn<ApiComputeRegistry>[] = canManage
        ? [
              ...columns,
              {
                  key: 'actions',
                  header: t('columns.action'),
                  width: pixel(96),
                  align: 'end',
                  renderCell: (compute) => (
                      <MoreMenu
                          label={t('common.openActionsFor', { name: compute.name })}
                          size="sm"
                          items={[
                              {
                                  label: `${t('actions.copy')} ${t('admin.copyComputeSlug').toLowerCase()}`,
                                  icon: <Icon icon="copy" size="sm" />,
                                  onClick: async () => {
                                      try {
                                          await navigator.clipboard.writeText(compute.slug);
                                          toast({ body: `${t('admin.copyComputeSlug')}: ${t('actions.copied')}` });
                                      } catch {
                                          toast({ body: t('toasts.copyFailed'), type: 'error' });
                                      }
                                  },
                              },
                              { label: t('actions.delete'), onClick: () => deleteDialog.openFor(compute) },
                          ]}
                      />
                  ),
              },
          ]
        : columns;

    return (
        <VStack gap={6} width="100%">
            <HStack gap={4} justify="between" align="end" wrap="wrap">
                <VStack gap={1}>
                    <Heading level={1}>{t('admin.computeTitle')}</Heading>
                    <Text type="supporting">{t('admin.computeDescription')}</Text>
                </VStack>
                <CreateCompute />
            </HStack>
            {isLoading && computes.length === 0 ? null : error && computes.length === 0 ? (
                <Banner status="error" title={error.message} />
            ) : (
                <Table
                    columns={computeColumns}
                    data={paginateData(computes, currentPage, pageSize)}
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
