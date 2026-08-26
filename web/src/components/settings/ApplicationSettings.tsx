import Logs from '@/components/dialogs/Logs';
import { useDeleteDialog } from '@/lib/utils';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { useToast } from '@/lib/hooks/use-toast';
import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Heading } from '@astryxdesign/core/Heading';
import { useState, type ComponentProps } from 'react';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import CreateApplication from '@/components/dialogs/CreateApplication';
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';
import { useDeleteOrganizationApplication } from '@/lib/hooks/use-organization';
import { Table, type TableColumn, pixel, proportional } from '@astryxdesign/core/Table';
import type { OrganizationApplicationSummary, Status } from '@/lib/generated/platform-api-v1/types.gen';

const statusPresentation = {
    creating: { label: 'Creating', variant: 'info' },
    running: { label: 'Running', variant: 'neutral' },
} satisfies Record<Status, { label: string; variant: ComponentProps<typeof Badge>['variant'] }>;

/** Renders Organization-owned Application management. */
export default function ApplicationSettings({
    organizationId,
    organizationSlug,
    applications,
    canManageApplications,
    isLoading,
    error,
}: {
    organizationId: string;
    organizationSlug: string;
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
                <VStack gap={1}>
                    <HStack gap={1} align="center">
                        <Link href={`/orgs/${organizationSlug}/apps/${application.slug}`} weight="semibold">
                            {application.name}
                        </Link>
                        <Badge {...statusPresentation[application.status]} />
                    </HStack>
                    {application.description ? <Text type="supporting">{application.description}</Text> : null}
                </VStack>
            ),
        },
        ...(canManageApplications
            ? [
                  {
                      key: 'action',
                      header: 'Action',
                      width: pixel(96),
                      align: 'end' as const,
                      renderCell: (application: OrganizationApplicationSummary) => (
                          <MoreMenu
                              label={`Open actions for ${application.name}`}
                              size="sm"
                              items={[
                                  { label: 'Logs', onClick: () => setLogsTarget(application) },
                                  { label: 'Delete', onClick: () => deleteDialog.openFor(application) },
                              ]}
                          />
                      ),
                  },
              ]
            : []),
    ];

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
