import { api } from '@/lib/api';
import { useState } from 'react';
import { Ellipsis } from 'lucide-react';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/lib/hooks/use-toast';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { usePaginate } from '@/lib/hooks/pagination';
import { Heading } from '@astryxdesign/core/Heading';
import { StatusBadge } from '@/components/ui/StatusBadge';
import MetadataDialog from '@/components/dialogs/Metadata';
import { Table, TableColumn } from '@/components/ui/Table';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { IconButton } from '@astryxdesign/core/IconButton';
import { PageError, PageLoading } from '@/components/Utils';
import { pixel, proportional } from '@astryxdesign/core/Table';
import { dateTimeFormatter, useDeleteDialog } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { zPageApplicationResponse } from '@/lib/generated/platform-api-v1/zod.gen';
import type { ApplicationResponse } from '@/lib/generated/platform-api-v1/types.gen';

/** Renders the admin applications page. */
export default function AdminApplications() {
    const [metadataApplication, setMetadataApplication] = useState<ApplicationResponse | null>(null);
    const closeMetadataApplication = () => setMetadataApplication(null);
    const toast = useToast();
    const queryClient = useQueryClient();
    const deleteApplication = useMutation({
        mutationFn: (applicationId: string) => api(`/api/v1/applications/${applicationId}`, { method: 'DELETE' }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['api', '/api/v1/applications'] });
            toast({ body: 'Application deleted' });
        },
    });
    const {
        items: applications,
        error,
        isLoading,
        pagination,
    } = usePaginate('/api/v1/applications', zPageApplicationResponse, 5000);
    const deleteDialog = useDeleteDialog({
        title: 'Delete application',
        mutation: deleteApplication,
        items: applications,
        getId: (application) => application.id,
        description: (application) => `Delete application ${application.name}?`,
        errorMessage: 'Failed to delete application',
        fallbackDescription: 'Delete this application?',
        onError: (message) => toast({ body: message, type: 'error' }),
    });

    if (isLoading && applications.length === 0) {
        return <PageLoading label="Loading applications" />;
    }

    if (error && applications.length === 0) {
        return (
            <PageError description="We couldn't load the platform applications." title="Unable to load applications" />
        );
    }

    return (
        <Stack gap={8}>
            <Stack>
                <Heading level={1}>Applications</Heading>
                <Text as="p" color="secondary">
                    Review all applications across organizations and deployment states.
                </Text>
            </Stack>
            <Table
                data={applications}
                density="compact"
                emptyState={<EmptyState title="No results." isCompact />}
                hasHover
                idKey="id"
                plugins={{ pagination }}
            >
                <TableColumn<ApplicationResponse> field="name" header="Application" width={proportional(2)}>
                    {(app) => (
                        <Stack>
                            <Stack direction="horizontal" gap={1} align="center">
                                <Link href={`/orgs/${app.organization.slug}/apps/${app.slug}`} weight="semibold">
                                    {app.name}
                                </Link>
                                <StatusBadge status={app.status} />
                            </Stack>
                            {app.description ? <Text type="supporting">{app.description}</Text> : null}
                        </Stack>
                    )}
                </TableColumn>
                <TableColumn<ApplicationResponse> field="organization" header="Organization" width={proportional(1)}>
                    {(app) => (
                        <Stack direction="horizontal" gap={3} align="center">
                            <Avatar kind="organization" src={app.organization.avatar} name={app.organization.name} />
                            <Link href={`/orgs/${app.organization.slug}`} weight="semibold">
                                {app.organization.name}
                            </Link>
                        </Stack>
                    )}
                </TableColumn>
                <TableColumn<ApplicationResponse> align="end" field="metadata" header="" width={pixel(56)}>
                    {(app) => (
                        <IconButton
                            icon={<Ellipsis />}
                            label={`View metadata for ${app.name}`}
                            tooltip="View metadata"
                            variant="ghost"
                            size="sm"
                            onClick={() => setMetadataApplication(app)}
                        />
                    )}
                </TableColumn>
            </Table>
            {metadataApplication && (
                <MetadataDialog
                    footer={
                        <Stack direction="horizontal" gap={2} justify="end">
                            <Button
                                className="text-warning underline"
                                label="Delete"
                                variant="ghost"
                                onClick={() => {
                                    const application = metadataApplication;
                                    setMetadataApplication(null);
                                    deleteDialog.openFor(application);
                                }}
                            />
                            <Button label="Close" variant="primary" onClick={closeMetadataApplication} />
                        </Stack>
                    }
                    onClose={closeMetadataApplication}
                    title="Application metadata"
                >
                    <MetadataList>
                        <MetadataListItem label="Status">
                            <StatusBadge status={metadataApplication.status} />
                        </MetadataListItem>
                        <MetadataListItem label="Organization">
                            {metadataApplication.organization.name}
                        </MetadataListItem>
                        <MetadataListItem label="Image">{metadataApplication.image_desired}</MetadataListItem>
                        <MetadataListItem label="ID">{metadataApplication.id}</MetadataListItem>
                        <MetadataListItem label="Slug">{metadataApplication.slug}</MetadataListItem>
                        {metadataApplication.description ? (
                            <MetadataListItem label="Description">{metadataApplication.description}</MetadataListItem>
                        ) : null}
                        <MetadataListItem label="Created">
                            {dateTimeFormatter.format(new Date(metadataApplication.created_at))}
                        </MetadataListItem>
                    </MetadataList>
                </MetadataDialog>
            )}
            <DeleteConfirmation {...deleteDialog.dialogProps} />
        </Stack>
    );
}
