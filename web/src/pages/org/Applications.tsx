import { Icon } from '@astryxdesign/core/Icon';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { proportional } from '@astryxdesign/core/Table';
import type { ApiOrganizationApplication } from '@/lib/types';
import { useTranslation } from '@/lib/i18n';
import { DataTable, type DataTableColumn } from '@/components/DataTable';

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
    const { t } = useTranslation();
    const applicationsError = error ? new Error(t('errors.loadApplications')) : null;
    const columns: DataTableColumn<ApiOrganizationApplication>[] = [
        {
            key: 'name',
            header: t('columns.application'),
            width: proportional(1),
            renderCell: (application) => (
                <HStack gap={3} align="center">
                    <Icon icon="wrench" color="accent" />
                    <VStack gap={1}>
                        <Link href={`/orgs/${organization}/apps/${application.slug}`} weight="semibold">
                            {application.name}
                        </Link>
                        {application.description ? <Text type="supporting">{application.description}</Text> : null}
                    </VStack>
                </HStack>
            ),
        },
    ];

    return <DataTable columns={columns} data={applications} error={applicationsError} isLoading={isLoading} />;
}
