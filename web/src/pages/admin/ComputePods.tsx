import { useQuery } from '@tanstack/react-query';

import { type ColumnDef } from '@tanstack/react-table';
import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { Container } from 'lucide-react';
import { useParams } from 'react-router';

import { DataTable } from '@/components/DataTable';
import { apiUrl, fetchApiJson } from '@/lib/api';
import type { ApiComputePod } from '@/lib/types';

const podColumns: Array<ColumnDef<ApiComputePod>> = [
    {
        accessorKey: 'name',
        header: 'Pod',
        cell: ({ getValue }) => getValue<string>(),
        meta: { className: 'min-w-56' },
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
