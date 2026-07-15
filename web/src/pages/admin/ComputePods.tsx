import { useParams } from 'react-router';
import { type ColumnDef } from '@tanstack/react-table';
import type { ApiComputePod } from '@/lib/types';
import { useTranslation } from '@/lib/i18n';
import { DataTable } from '@/components/DataTable';
import { useComputePods, useComputes } from '@/data/compute';
import { Hero, HeroDescription, HeroTitle } from '@/components/ui/hero';

/** Renders pods in a namespace on a compute backend. */
export default function ComputePods() {
    const { t } = useTranslation();
    const { compute = '', namespace = '' } = useParams();
    const podColumns: Array<ColumnDef<ApiComputePod>> = [
        {
            accessorKey: 'name',
            header: t('columns.pod'),
            cell: ({ getValue }) => getValue<string>(),
            meta: { className: 'min-w-48' },
        },
        {
            accessorKey: 'status',
            header: t('columns.status'),
            cell: ({ getValue }) => getValue<string>(),
            meta: { className: 'w-28' },
        },
        {
            accessorKey: 'node',
            header: t('columns.node'),
            cell: ({ getValue }) => getValue<string>() || '—',
            meta: { className: 'w-48' },
        },
    ];

    const { items: computes, error: computeError, isLoading: computesIsLoading } = useComputes();

    const computeRegistry = computes.find((registry) => registry.slug === compute);

    const {
        items: rows,
        error: podsError,
        isLoading: podsIsLoading,
    } = useComputePods(computeRegistry?.id ?? '', namespace);
    const error =
        computeError ??
        (!computesIsLoading && !computeRegistry
            ? new Error(t('resources.computeNotFound', { name: compute }))
            : podsError);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <Hero icon="container">
                    <div>
                        <HeroTitle>{t('resources.podsTitle')}</HeroTitle>
                        <HeroDescription>
                            {t('resources.podsDescription', { namespace, name: computeRegistry?.slug || compute })}
                        </HeroDescription>
                    </div>
                </Hero>
            </div>
            <DataTable
                columns={podColumns}
                data={rows}
                error={error}
                isLoading={computesIsLoading || podsIsLoading}
                pageSize={25}
            />
        </div>
    );
}
