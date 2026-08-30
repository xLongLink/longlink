import { useState } from 'react';
import Logs from '@/components/dialogs/Logs';
import { Stack } from '@/components/ui/Stack';
import { useDeleteDialog } from '@/lib/utils';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { useToast } from '@/lib/hooks/use-toast';
import { Banner } from '@astryxdesign/core/Banner';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import CreateApplication from '@/components/dialogs/CreateApplication';
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';
import { useDeleteOrganizationApplication } from '@/lib/hooks/use-organization';
import { Table, type TableColumn, pixel, proportional } from '@astryxdesign/core/Table';
import type { OrganizationApplicationSummary } from '@/lib/generated/platform-api-v1/types.gen';

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
                <Stack>
                    <Stack direction="horizontal" gap={1} align="center">
                        <Link href={`/orgs/${organizationSlug}/apps/${application.slug}`} weight="semibold">
                            {application.name}
                        </Link>
                        <StatusBadge status={application.status} />
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
                      align: 'end',
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
                    <Heading level={2}>Applications</Heading>
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
