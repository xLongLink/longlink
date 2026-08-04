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
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';
import Logs from '@/components/dialogs/Logs';
import { useDeleteOrganizationApplication } from '@/hooks/use-organization';
import { useToast } from '@/hooks/use-toast';
import type { OrganizationApplicationSummary } from '@/lib/generated/platform-api-v1/types.gen';
import { useDeleteDialog } from '@/lib/utils';

/** Renders Organization-owned Application management. */
export default function ApplicationSettings({
    organizationId,
    applications,
    canManageApplications,
    isLoading,
    error,
}: {
    organizationId: string;
    applications: OrganizationApplicationSummary[];
    canManageApplications: boolean;
    isLoading: boolean;
    error: Error | null;
}) {
    const t = useTranslator();
    const toast = useToast();
    const [logsTarget, setLogsTarget] = useState<OrganizationApplicationSummary | null>(null);
    const deleteApplication = useDeleteOrganizationApplication(organizationId);
    const deleteDialog = useDeleteDialog({
        title: t('organizationSettings.deleteApplicationTitle'),
        mutation: deleteApplication,
        items: applications,
        getId: (application) => application.id,
        description: (application) =>
            t('organizationSettings.deleteApplicationDescription', { name: application.name }),
        errorMessage: t('organizationSettings.failedDeleteApplication'),
        fallbackDescription: t('organizationSettings.deleteApplicationFallback'),
        onError: (message) => toast({ body: message, type: 'error' }),
    });
    const appColumns: TableColumn<OrganizationApplicationSummary>[] = [
        {
            key: 'name',
            header: t('columns.application'),
            width: proportional(1),
            renderCell: (application) => (
                <HStack gap={3} align="center">
                    <Wrench aria-hidden="true" className="shrink-0 text-accent" size={20} />
                    <VStack gap={1}>
                        <Text weight="semibold">{application.name}</Text>
                        {application.description ? <Text type="supporting">{application.description}</Text> : null}
                    </VStack>
                </HStack>
            ),
        },
    ];

    if (canManageApplications) {
        appColumns.push({
            key: 'action',
            header: t('columns.action'),
            width: pixel(96),
            align: 'end',
            renderCell: (application) => (
                <MoreMenu
                    label={t('common.openActionsFor', { name: application.name })}
                    size="sm"
                    items={[
                        { label: t('organizationSettings.logs'), onClick: () => setLogsTarget(application) },
                        { label: t('actions.delete'), onClick: () => deleteDialog.openFor(application) },
                    ]}
                />
            ),
        });
    }

    return (
        <>
            <VStack gap={4}>
                <HStack gap={4} justify="between" align="end" wrap="wrap">
                    <VStack gap={1}>
                        <Heading level={2}>{t('navigation.applications')}</Heading>
                        <Text type="supporting">{t('organizationSettings.reviewApplications')}</Text>
                    </VStack>
                    {canManageApplications ? <CreateApplication organizationId={organizationId} /> : null}
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
                        idKey="id"
                    />
                )}
            </VStack>

            {logsTarget ? (
                <Logs
                    applicationId={logsTarget.id}
                    applicationName={logsTarget.name}
                    onOpenChange={(open) => !open && setLogsTarget(null)}
                />
            ) : null}

            <DeleteConfirmation {...deleteDialog.dialogProps} />
        </>
    );
}
