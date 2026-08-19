import { useState } from 'react';
import { Wrench } from 'lucide-react';
import Logs from '@/components/dialogs/Logs';
import { useDeleteDialog } from '@/lib/utils';
import { Text } from '@astryxdesign/core/Text';
import { useToast } from '@/lib/hooks/use-toast';
import { Banner } from '@astryxdesign/core/Banner';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Heading } from '@astryxdesign/core/Heading';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import CreateApplication from '@/components/dialogs/CreateApplication';
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';
import { useDeleteOrganizationApplication } from '@/lib/hooks/use-organization';
import { Table, type TableColumn, pixel, proportional } from '@astryxdesign/core/Table';
import type { OrganizationApplicationSummary } from '@/lib/generated/platform-api-v1/types.gen';

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
    const toast = useToast();
    const [logsTarget, setLogsTarget] = useState<OrganizationApplicationSummary | null>(null);
    const deleteApplication = useDeleteOrganizationApplication(organizationId);
    const deleteDialog = useDeleteDialog({
        title: 'Delete application',
        mutation: deleteApplication,
        items: applications,
        getId: (application) => application.id,
        description: (application) => `Delete ${application.name} from this organization?`,
        errorMessage: 'Failed to delete application',
        fallbackDescription: 'Delete this application?',
        onError: (message) => toast({ body: message, type: 'error' }),
    });
    const appColumns: TableColumn<OrganizationApplicationSummary>[] = [
        {
            key: 'name',
            header: 'Application',
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
            header: 'Action',
            width: pixel(96),
            align: 'end',
            renderCell: (application) => (
                <MoreMenu
                    label={`Open actions for ${application.name}`}
                    size="sm"
                    items={[
                        { label: 'Logs', onClick: () => setLogsTarget(application) },
                        { label: 'Delete', onClick: () => deleteDialog.openFor(application) },
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
                        <Heading level={2}>Applications</Heading>
                        <Text type="supporting">Review applications connected to this organization.</Text>
                    </VStack>
                    {canManageApplications ? <CreateApplication organizationId={organizationId} /> : null}
                </HStack>

                {isLoading && applications.length === 0 ? null : error && applications.length === 0 ? (
                    <Banner status="error" title="Failed to load applications." />
                ) : (
                    <Table
                        columns={appColumns}
                        data={applications}
                        density="compact"
                        emptyState={<EmptyState title="No applications found." isCompact />}
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
