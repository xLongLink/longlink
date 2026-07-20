import { useParams } from 'react-router';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { Heading } from '@astryxdesign/core/Heading';
import { proportional } from '@astryxdesign/core/Table';
import { useTranslation } from '@/lib/i18n';
import { useComputeNamespaces, useComputes } from '@/data/compute';
import { DataTable, type DataTableColumn } from '@/components/DataTable';

type ComputeNamespaceRow = {
    name: string;
};

/** Renders namespaces for a compute backend. */
export default function ComputeNamespaces() {
    const { t } = useTranslation();
    const { compute = '' } = useParams();
    const { items: computes, error: computeError, isLoading: computesIsLoading } = useComputes();
    const computeRegistry = computes.find((registry) => registry.slug === compute);
    const columns: DataTableColumn<ComputeNamespaceRow>[] = [
        {
            key: 'name',
            header: t('columns.namespace'),
            width: proportional(1),
            renderCell: (row) => (
                <Link
                    href={`/admin/compute/${encodeURIComponent(compute)}/namespace/${encodeURIComponent(row.name)}`}
                    weight="semibold"
                >
                    {row.name}
                </Link>
            ),
        },
    ];
    const {
        items: namespaceNames,
        error: namespacesError,
        isLoading: namespacesIsLoading,
    } = useComputeNamespaces(computeRegistry?.id ?? '');
    const rows = namespaceNames.map((name) => ({ name }));
    const error =
        computeError ??
        (!computesIsLoading && !computeRegistry
            ? new Error(t('resources.computeNotFound', { name: compute }))
            : namespacesError);

    return (
        <VStack gap={6} width="100%">
            <VStack gap={1}>
                <Heading level={1}>{t('resources.namespacesTitle')}</Heading>
                <Text type="supporting">
                    {t('resources.namespacesDescription', { name: computeRegistry?.slug || compute })}
                </Text>
            </VStack>
            <DataTable
                columns={columns}
                data={rows}
                error={error}
                isLoading={computesIsLoading || namespacesIsLoading}
                pageSize={25}
            />
        </VStack>
    );
}
