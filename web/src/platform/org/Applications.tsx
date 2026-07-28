import { Banner } from '@astryxdesign/core/Banner';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { HStack } from '@astryxdesign/core/HStack';
import { useTranslator } from '@astryxdesign/core/i18n';
import { Link } from '@astryxdesign/core/Link';
import { Table, type TableColumn, proportional } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { Wrench } from 'lucide-react';
import type { ApiOrganizationApplication } from '@/lib/types';

/** Renders the organization applications table. */
export default function Applications({
    organization,
    applications,
    isLoading,
    error,
}: {
    organization: string;
    applications: ApiOrganizationApplication[];
    isLoading: boolean;
    error: Error | null;
}) {
    const t = useTranslator();
    const applicationsError = error ? t('errors.loadApplications') : null;
    const columns: TableColumn<ApiOrganizationApplication>[] = [
        {
            key: 'name',
            header: t('columns.application'),
            width: proportional(1),
            renderCell: (access) => (
                <HStack gap={3} align="center">
                    <Wrench aria-hidden="true" className="shrink-0 text-accent" size={20} />
                    <VStack gap={1}>
                        <Link href={`/orgs/${organization}/apps/${access.application.slug}`} weight="semibold">
                            {access.application.name}
                        </Link>
                        {access.application.description ? (
                            <Text type="supporting">{access.application.description}</Text>
                        ) : null}
                    </VStack>
                </HStack>
            ),
        },
    ];

    if (isLoading && applications.length === 0) {
        return null;
    }

    // Surface application lookup failures when no stale data is available.
    if (applicationsError && applications.length === 0) {
        return <Banner status="error" title={applicationsError} />;
    }

    return (
        <Table
            columns={columns}
            data={applications}
            density="compact"
            emptyState={<EmptyState title={t('common.noResults')} isCompact />}
            hasHover
            idKey={(access) => access.application.id}
        />
    );
}
