import type { TFunction } from 'i18next';
import { useState } from 'react';
import { Icon } from '@astryxdesign/core/Icon';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import { Avatar } from '@astryxdesign/core/Avatar';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Heading } from '@astryxdesign/core/Heading';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import {
    Table,
    type TableColumn,
    pixel,
    paginateData,
    proportional,
    useTablePagination,
} from '@astryxdesign/core/Table';
import type { ApiApplicationResponse } from '@/lib/types';
import { useTranslation } from '@/lib/i18n';
import { formatDateTime } from '@/lib/utils';
import { useApplications } from '@/data/admin';

/** Builds localized admin application table columns. */
function createAppColumns(t: TFunction): TableColumn<ApiApplicationResponse>[] {
    return [
        {
            key: 'name',
            header: t('columns.application'),
            width: proportional(2),
            renderCell: (app) => (
                <HStack gap={3} align="start">
                    <Icon icon="wrench" color="accent" />
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
                    <Avatar src={app.organization.avatar ?? undefined} name={app.organization.name} size="small" />
                    <VStack gap={1}>
                        <Link href={`/orgs/${app.organization.slug}`} weight="semibold">
                            {app.organization.name}
                        </Link>
                        <Text type="supporting">{app.organization.country}</Text>
                    </VStack>
                </HStack>
            ),
        },
        {
            key: 'status',
            header: t('columns.status'),
            width: pixel(128),
            renderCell: (app) => <Badge label={app.status} />,
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
}

/** Renders the admin applications page. */
export default function AdminApplications() {
    const { t } = useTranslation();
    const { items: applications, error, isLoading } = useApplications();
    const [page, setPage] = useState(1);
    const pageSize = 25;
    const pageCount = Math.max(1, Math.ceil(applications.length / pageSize));
    const currentPage = Math.min(page, pageCount);
    const pagination = useTablePagination<ApiApplicationResponse>({
        page: currentPage,
        onPageChange: setPage,
        totalItems: applications.length,
        pageSize,
        label: `${t('actions.previous')} / ${t('actions.next')}`,
        size: 'sm',
    });

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
                    columns={createAppColumns(t)}
                    data={paginateData(applications, currentPage, pageSize)}
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
