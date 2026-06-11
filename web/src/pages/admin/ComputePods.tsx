import { useQuery } from '@tanstack/react-query';

import { type ColumnDef } from '@tanstack/react-table';
import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { Container } from 'lucide-react';
import { useParams } from 'react-router';

import { DataTable } from '@/components/DataTable';
import { apiUrl, fetchApiJson } from '@/lib/api';
import type { ApiComputePod } from '@/lib/types';

function formatBytes(bytes: number): string {
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit++;
    }
    return `${Math.round(value)} ${units[unit]}`;
}

const podColumns: Array<ColumnDef<ApiComputePod>> = [
    {
        accessorKey: 'name',
        header: 'Pod',
        cell: ({ getValue }) => getValue<string>(),
        meta: { className: 'min-w-48' },
    },
    {
        id: 'resources',
        header: 'Resources',
        cell: ({ row }) => {
            const r = row.original.resources;
            if (!r) return <span className="text-muted-foreground">—</span>;
            return (
                <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                        <span className="font-medium text-foreground">{formatBytes(r.ram_usage)}</span>
                        {r.ram_limit > 0 && (
                            <span className="text-xs text-muted-foreground">
                                / {formatBytes(r.ram_limit)}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="font-medium text-foreground">{r.cpu_usage.toFixed(2)} vCPU</span>
                        {r.cpu_limit > 0 && (
                            <span className="text-xs text-muted-foreground">
                                / {r.cpu_limit} vCPU
                            </span>
                        )}
                    </div>
                </div>
            );
        },
        meta: { className: 'w-56' },
    },
    {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => getValue<string>(),
        meta: { className: 'w-28' },
    },
    {
        accessorKey: 'node',
        header: 'Node',
        cell: ({ getValue }) => getValue<string>() || '—',
        meta: { className: 'w-48' },
    },
    {
        accessorKey: 'created_at',
        header: 'Created',
        cell: ({ getValue }) => {
            const value = getValue<string | null>();
            return value ? new Date(value).toLocaleString() : '—';
        },
        meta: { className: 'w-52' },
    },
];

/** Renders pods in a namespace on a compute backend. */
export default function ComputePods() {
    const { id = '', namespace = '' } = useParams();
    const encodedId = encodeURIComponent(id);
    const encodedNamespace = encodeURIComponent(namespace);
    const podsUrl = apiUrl(`/api/compute/${encodedId}/namespaces/${encodedNamespace}/pods`);

    const podsQuery = useQuery({
        queryKey: ['api', podsUrl],
        queryFn: async () => fetchApiJson<Array<ApiComputePod>>(podsUrl, { credentials: 'include' }),
        retry: false,
        refetchOnMount: 'always',
    });

    const rows = podsQuery.data ?? [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <Hero icon={<Container />}>
                    <div>
                        <HeroTitle>Pods</HeroTitle>
                        <HeroDescription>
                            Pods in namespace <span className="font-medium text-foreground">{namespace}</span> on compute
                            backend #{id}.
                        </HeroDescription>
                    </div>
                </Hero>
            </div>
            <DataTable
                columns={podColumns}
                data={rows}
                error={podsQuery.error}
                isLoading={podsQuery.isLoading}
                loadingLabel="Loading pods..."
            />
        </div>
    );
}
