import { api } from '@/lib/api';
import { Wrench } from 'lucide-react';
import type { ComponentProps } from 'react';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { dateTimeFormatter } from '@/lib/utils';
import { Badge } from '@astryxdesign/core/Badge';
import { useQuery } from '@tanstack/react-query';
import { Avatar } from '@astryxdesign/core/Avatar';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { usePaginate } from '@/lib/hooks/pagination';
import { Heading } from '@astryxdesign/core/Heading';
import { Table, TableColumn } from '@/components/ui/Table';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { PageError, PageLoading } from '@/components/Utils';
import { pixel, proportional } from '@astryxdesign/core/Table';
import { zApplicationResponse } from '@/lib/generated/platform-api-v1/zod.gen';
import type { ApplicationResponse, Status } from '@/lib/generated/platform-api-v1/types.gen';

const statusVariants = {
    creating: 'info',
    running: 'neutral',
} satisfies Record<Status, ComponentProps<typeof Badge>['variant']>;

/** Renders the admin applications page. */
export default function AdminApplications() {
    const statusLabels: Record<Status, string> = {
        creating: 'Creating',
        running: 'Running',
    };
    const {
        data: applications = [],
        error,
        isLoading,
    } = useQuery({
        queryKey: ['api', '/api/v1/applications'],
        queryFn: async ({ signal }) =>
            zApplicationResponse.array().parse(await api('/api/v1/applications', { signal }).json()),
        refetchInterval: 5000,
    });
    const { pageItems, pagination } = usePaginate(applications);

    if (isLoading && applications.length === 0) {
        return <PageLoading label="Loading applications" />;
    }

    if (error && applications.length === 0) {
        return (
            <PageError description="We couldn't load the platform applications." title="Unable to load applications" />
        );
    }

    return (
        <VStack gap={6} width="100%">
            <VStack gap={1}>
                <Heading level={1}>Applications</Heading>
                <Text type="supporting">Review all applications across organizations and deployment states.</Text>
            </VStack>
            <Table
                data={pageItems}
                density="compact"
                emptyState={<EmptyState title="No results." isCompact />}
                hasHover
                idKey="id"
                plugins={{ pagination }}
            >
                <TableColumn<ApplicationResponse> field="name" header="Application" width={proportional(2)}>
                    {(app) => (
                        <HStack gap={3} align="start">
                            <Wrench className="text-accent" size={20} />
                            <VStack gap={1}>
                                <Link href={`/orgs/${app.organization.slug}/apps/${app.slug}`} weight="semibold">
                                    {app.name}
                                </Link>
                                {app.description ? <Text type="supporting">{app.description}</Text> : null}
                            </VStack>
                        </HStack>
                    )}
                </TableColumn>
                <TableColumn<ApplicationResponse> field="organization" header="Organization" width={proportional(1)}>
                    {(app) => (
                        <HStack gap={3} align="center">
                            <Avatar src={app.organization.avatar ?? undefined} name={app.organization.name} size="md" />
                            <Link href={`/orgs/${app.organization.slug}`} weight="semibold">
                                {app.organization.name}
                            </Link>
                        </HStack>
                    )}
                </TableColumn>
                <TableColumn<ApplicationResponse> field="status" header="Status" width={pixel(128)}>
                    {(app) => <Badge label={statusLabels[app.status]} variant={statusVariants[app.status]} />}
                </TableColumn>
                <TableColumn<ApplicationResponse> field="image_desired" header="Image" width={proportional(2)}>
                    {(app) => <Text type="supporting">{app.image_desired}</Text>}
                </TableColumn>
                <TableColumn<ApplicationResponse> field="created_at" header="Created" width={pixel(208)}>
                    {(app) => dateTimeFormatter.format(new Date(app.created_at))}
                </TableColumn>
            </Table>
        </VStack>
    );
}
