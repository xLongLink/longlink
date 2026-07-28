import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { Banner } from '@astryxdesign/core/Banner';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { useTranslator } from '@astryxdesign/core/i18n';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Table, type TableColumn, pixel, proportional } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { Wrench } from 'lucide-react';
import { useState } from 'react';
import CreateApplication from '@/components/dialogs/CreateApplication';
import Logs from '@/components/dialogs/Logs';
import { useDeleteOrganizationApplication } from '@/hooks/use-organization';
import { useToast } from '@/hooks/use-toast';
import type { ApiOrganizationApplication } from '@/lib/types';

type ApplicationSettingsProps = {
    organizationId: string;
    applications: ApiOrganizationApplication[];
    canManageApplications: boolean;
    isLoading: boolean;
    error: Error | null;
};

/** Renders Organization-owned Application management. */
export default function ApplicationSettings({
    organizationId,
    applications,
    canManageApplications,
    isLoading,
    error,
}: ApplicationSettingsProps) {
    const t = useTranslator();
    const toast = useToast();
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [logsTarget, setLogsTarget] = useState<ApiOrganizationApplication['application'] | null>(null);
    const deleteApplication = useDeleteOrganizationApplication(organizationId);
    const deleteTarget = applications.find((application) => application.application.id === deleteTargetId) ?? null;
    const appColumns: TableColumn<ApiOrganizationApplication>[] = [
        {
            key: 'name',
            header: t('columns.application'),
            width: proportional(1),
            renderCell: ({ application }) => (
                <HStack gap={3} align="center">
                    <Wrench aria-hidden="true" className="shrink-0 text-accent" size={20} />
                    <VStack gap={1}>
                        <Text weight="semibold">{application.name}</Text>
                        {application.description ? <Text type="supporting">{application.description}</Text> : null}
                    </VStack>
                </HStack>
            ),
        },
        {
            key: 'action',
            header: t('columns.action'),
            width: pixel(96),
            align: 'end',
            renderCell: ({ application }) => {
                // Organization maintainers own every available Application action.
                if (!canManageApplications) {
                    return '-';
                }

                return (
                    <MoreMenu
                        label={t('common.openActionsFor', { name: application.name })}
                        size="sm"
                        items={[
                            { label: t('organizationSettings.logs'), onClick: () => setLogsTarget(application) },
                            { label: t('actions.delete'), onClick: () => setDeleteTargetId(application.id) },
                        ]}
                    />
                );
            },
        },
    ];

    return (
        <>
            <VStack gap={4}>
                <HStack gap={4} justify="between" align="end" wrap="wrap">
                    <VStack gap={1}>
                        <Heading level={2}>{t('navigation.applications')}</Heading>
                        <Text type="supporting">{t('organizationSettings.reviewApplications')}</Text>
                    </VStack>
                    <CreateApplication organizationId={organizationId} canCreate={canManageApplications} />
                </HStack>

                {isLoading && applications.length === 0 ? null : error && applications.length === 0 ? (
                    <Banner status="error" title={t('organizationSettings.loadApplicationsFailed')} />
                ) : (
                    <Table
                        columns={appColumns}
                        data={applications}
                        density="compact"
                        emptyState={<EmptyState title={t('organizationSettings.noApplications')} isCompact />}
                        hasHover
                        idKey={(access) => access.application.id}
                    />
                )}
            </VStack>

            {logsTarget ? (
                <Logs
                    applicationId={logsTarget.id}
                    applicationName={logsTarget.name}
                    onOpenChange={(open) => {
                        // Clear the selected log target when closing.
                        if (!open) {
                            setLogsTarget(null);
                        }
                    }}
                />
            ) : null}

            <AlertDialog
                isOpen={deleteTargetId !== null}
                onOpenChange={(open) => {
                    // Reset delete dialog state when closing.
                    if (!open) {
                        setDeleteTargetId(null);
                    }
                }}
                title={t('organizationSettings.deleteApplicationTitle')}
                description={
                    deleteTarget
                        ? t('organizationSettings.deleteApplicationDescription', {
                              name: deleteTarget.application.name,
                          })
                        : t('organizationSettings.deleteApplicationFallback')
                }
                cancelLabel={t('actions.cancel')}
                actionLabel={t('actions.delete')}
                isActionLoading={deleteApplication.isPending}
                onAction={async () => {
                    // Ignore submits without a selected target.
                    if (deleteTargetId === null) {
                        return;
                    }

                    try {
                        await deleteApplication.mutateAsync(deleteTargetId);
                        setDeleteTargetId(null);
                    } catch (mutationError) {
                        toast({
                            body:
                                mutationError instanceof Error
                                    ? mutationError.message
                                    : t('organizationSettings.failedDeleteApplication'),
                            type: 'error',
                        });
                    }
                }}
            />
        </>
    );
}
