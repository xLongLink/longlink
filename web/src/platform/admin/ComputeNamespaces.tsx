import { Banner } from '@astryxdesign/core/Banner';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { useTranslator } from '@astryxdesign/core/i18n';
import { Link } from '@astryxdesign/core/Link';
import { Table, type TableColumn, proportional } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useParams } from 'react-router';
import { useComputeNamespaces, useComputes } from '@/data/compute';
import { useAdminPagination } from '@/platform/admin/pagination';

type ComputeNamespaceRow = Record<string, unknown> & {
    name: string;
};

/** Renders namespaces for a compute backend. */
export default function ComputeNamespaces() {
    const t = useTranslator();
    const { compute = '' } = useParams();
    const { items: computes, error: computeError, isLoading: computesIsLoading } = useComputes();
    const computeRegistry = computes.find((registry) => registry.slug === compute);
    const columns: TableColumn<ComputeNamespaceRow>[] = [
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
    const { pageItems, pagination } = useAdminPagination(rows);
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
            {(computesIsLoading || namespacesIsLoading) && rows.length === 0 ? null : error && rows.length === 0 ? (
                <Banner status="error" title={error.message} />
            ) : (
                <Table
                    columns={columns}
                    data={pageItems}
                    density="compact"
                    emptyState={<EmptyState title={t('common.noResults')} isCompact />}
                    hasHover
                    idKey="name"
                    plugins={{ pagination }}
                />
            )}
        </VStack>
    );
}
