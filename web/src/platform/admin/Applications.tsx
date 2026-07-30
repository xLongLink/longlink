import { Avatar } from '@astryxdesign/core/Avatar';
import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { useTranslator } from '@astryxdesign/core/i18n';
import { Link } from '@astryxdesign/core/Link';
import { Table, type TableColumn, pixel, proportional } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { Wrench } from 'lucide-react';
import type { ComponentProps } from 'react';
import { useCollectionQuery } from '@/hooks/use-collection-query';
import { apiApplicationResponseSchema } from '@/lib/api-schemas';
import { createStatusLabels } from '@/lib/status';
import type { ApiApplicationResponse, Status } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';
import { useAdminPagination } from '@/platform/admin/pagination';

const statusVariants = {
    creating: 'info',
    running: 'neutral',
    failed: 'error',
    deleting: 'neutral',
} satisfies Record<Status, ComponentProps<typeof Badge>['variant']>;

/** Renders the admin applications page. */
export default function AdminApplications() {
    const t = useTranslator();
    const statusLabels = createStatusLabels(t);
    const columns: TableColumn<ApiApplicationResponse>[] = [
        {
            key: 'name',
            header: t('columns.application'),
            width: proportional(2),
            renderCell: (app) => (
                <HStack gap={3} align="start">
                    <Wrench className="text-accent" size={20} />
                    <VStack gap={1}>
                        <Link href={`/orgs/${app.organization.slug}/apps/${app.slug}`} weight="semibold">
                            {app.name}
                        </Link>
                        {app.description ? <Text type="supporting">{app.description}</Text> : null}
                    </VStack>
                </HStack>
            ),
        },
        {
            key: 'organization',
            header: t('columns.organization'),
            width: proportional(1),
            renderCell: (app) => (
                <HStack gap={3} align="center">
                    <Avatar src={app.organization.avatar ?? undefined} name={app.organization.name} size="md" />
                    <Link href={`/orgs/${app.organization.slug}`} weight="semibold">
                        {app.organization.name}
                    </Link>
                </HStack>
            ),
        },
        {
            key: 'status',
            header: t('columns.status'),
            width: pixel(128),
            renderCell: (app) => <Badge label={statusLabels[app.status]} variant={statusVariants[app.status]} />,
        },
        {
            key: 'image',
            header: t('columns.image'),
            width: proportional(2),
            renderCell: (app) => <Text type="supporting">{app.image}</Text>,
        },
        {
            key: 'created_at',
            header: t('columns.created'),
            width: pixel(208),
            renderCell: (app) => formatDateTime(app.created_at),
        },
    ];
    const {
        items: applications,
        error,
        isLoading,
    } = useCollectionQuery<ApiApplicationResponse>('/api/applications', {
        refetchInterval: 5000,
        parse: (value) => apiApplicationResponseSchema.array().parse(value),
    });
    const { pageItems, pagination } = useAdminPagination(applications);

    return (
        <VStack gap={6} width="100%">
            <VStack gap={1}>
                <Heading level={1}>{t('admin.applicationsTitle')}</Heading>
                <Text type="supporting">{t('admin.applicationsDescription')}</Text>
            </VStack>
            {isLoading && applications.length === 0 ? null : error && applications.length === 0 ? (
                <Banner status="error" title={error.message} />
            ) : (
                <Table
                    columns={columns}
                    data={pageItems}
                    density="compact"
                    emptyState={<EmptyState title={t('common.noResults')} isCompact />}
                    hasHover
                    idKey="id"
                    plugins={{ pagination }}
                />
            )}
        </VStack>
    );
}
