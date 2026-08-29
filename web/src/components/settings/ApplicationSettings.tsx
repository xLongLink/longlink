import Logs from '@/components/dialogs/Logs';
import { Stack } from '@/components/ui/Stack';
import { useDeleteDialog } from '@/lib/utils';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { useToast } from '@/lib/hooks/use-toast';
import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import { Divider } from '@astryxdesign/core/Divider';
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
    failed: { label: 'Failed', variant: 'error' },
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
                <Stack gap={0}>
                    <Stack direction="horizontal" gap={1} align="center">
                        <Link href={`/orgs/${organizationSlug}/apps/${application.slug}`} weight="semibold">
                            {application.name}
                        </Link>
                        {application.status === 'running' ? null : (
                            <Badge {...statusPresentation[application.status]} />
                        )}
                    </Stack>
                    {application.description ? <Text type="supporting">{application.description}</Text> : null}
                </Stack>
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
            <Stack gap={4}>
                <Stack direction="horizontal" gap={4} justify="between" align="end" wrap="wrap">
                    <Stack>
                        <Heading level={2}>Applications</Heading>
                    </Stack>
                    {canManageApplications ? <CreateApplication organizationId={organizationId} /> : null}
                </Stack>
                <Divider />

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
            </Stack>

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
