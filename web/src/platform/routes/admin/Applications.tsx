import { Ellipsis } from 'lucide-react';
import { Stack } from '@/components/ui/Stack';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { dateTimeFormatter } from '@/lib/utils';
import { Badge } from '@astryxdesign/core/Badge';
import { usePaginate } from '@/lib/hooks/pagination';
import { Heading } from '@astryxdesign/core/Heading';
import { useState, type ComponentProps } from 'react';
import { Table, TableColumn } from '@/components/ui/Table';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { IconButton } from '@astryxdesign/core/IconButton';
import { PageError, PageLoading } from '@/components/Utils';
import { pixel, proportional } from '@astryxdesign/core/Table';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { zPageApplicationResponse } from '@/lib/generated/platform-api-v1/zod.gen';
import type { ApplicationResponse, Status } from '@/lib/generated/platform-api-v1/types.gen';

const statusPresentation = {
    creating: { label: 'Creating', variant: 'info' },
    failed: { label: 'Failed', variant: 'error' },
    running: { label: 'Running', variant: 'neutral' },
} satisfies Record<Status, { label: string; variant: ComponentProps<typeof Badge>['variant'] }>;

/** Renders the admin applications page. */
export default function AdminApplications() {
    const [metadataApplication, setMetadataApplication] = useState<ApplicationResponse | null>(null);
    const {
        items: applications,
        error,
        isLoading,
        pagination,
    } = usePaginate('/api/v1/applications', zPageApplicationResponse, 5000);

    if (isLoading && applications.length === 0) {
        return <PageLoading label="Loading applications" />;
    }

    if (error && applications.length === 0) {
        return (
            <PageError description="We couldn't load the platform applications." title="Unable to load applications" />
        );
    }

    return (
        <Stack gap={6} width="100%">
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
                                <Badge {...statusPresentation[app.status]} />
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
            {metadataApplication ? (
                <Dialog
                    isOpen
                    onOpenChange={(isOpen) => {
                        if (!isOpen) {
                            setMetadataApplication(null);
                        }
                    }}
                    purpose="info"
                    width={560}
                >
                    <Layout
                        header={
                            <DialogHeader
                                title="Application metadata"
                                subtitle={metadataApplication.name}
                                onOpenChange={() => setMetadataApplication(null)}
                            />
                        }
                        content={
                            <LayoutContent>
                                <MetadataList>
                                    <MetadataListItem label="Status">
                                        <Badge {...statusPresentation[metadataApplication.status]} />
                                    </MetadataListItem>
                                    <MetadataListItem label="Organization">
                                        {metadataApplication.organization.name}
                                    </MetadataListItem>
                                    <MetadataListItem label="Image">
                                        {metadataApplication.image_desired}
                                    </MetadataListItem>
                                    <MetadataListItem label="ID">{metadataApplication.id}</MetadataListItem>
                                    <MetadataListItem label="Slug">{metadataApplication.slug}</MetadataListItem>
                                    {metadataApplication.description ? (
                                        <MetadataListItem label="Description">
                                            {metadataApplication.description}
                                        </MetadataListItem>
                                    ) : null}
                                    <MetadataListItem label="Created">
                                        {dateTimeFormatter.format(new Date(metadataApplication.created_at))}
                                    </MetadataListItem>
                                </MetadataList>
                            </LayoutContent>
                        }
                    />
                </Dialog>
            ) : null}
        </Stack>
    );
}
