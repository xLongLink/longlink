import { Hero, HeroDescription, HeroTitle } from '@/components/ui/hero';
import { type ColumnDef } from '@tanstack/react-table';
import { useParams } from 'react-router';

import { DataTable } from '@/components/DataTable';
import { useComputePods } from '@/hooks/use-compute-pods';
import { useComputes } from '@/hooks/use-computes';
import { useTranslation } from '@/lib/i18n';
import type { ApiComputePod } from '@/lib/types';
import { formatBytes, formatDateTime } from '@/lib/utils';

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
            id: 'resources',
            header: t('columns.resources'),
            cell: ({ row }) => {
                const r = row.original.resources;
                if (!r) return <span className="text-muted-foreground">—</span>;
                return (
                    <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                            <span className="font-medium text-foreground">{formatBytes(r.ram_usage)}</span>
                            {r.ram_limit > 0 && (
                                <span className="text-xs text-muted-foreground">/ {formatBytes(r.ram_limit)}</span>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="font-medium text-foreground">{r.cpu_usage.toFixed(2)} vCPU</span>
                            {r.cpu_limit > 0 && (
                                <span className="text-xs text-muted-foreground">/ {r.cpu_limit} vCPU</span>
                            )}
                        </div>
                    </div>
                );
            },
            meta: { className: 'w-56' },
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
        {
            accessorKey: 'created_at',
            header: t('columns.created'),
            cell: ({ getValue }) => {
                const value = getValue<string | null>();
                return value ? formatDateTime(value) : '—';
            },
            meta: { className: 'w-52' },
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
