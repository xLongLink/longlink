import { useQuery } from '@tanstack/react-query';

import { type ColumnDef } from '@tanstack/react-table';
import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { Layers } from 'lucide-react';
import { Link, useParams } from 'react-router';

import { DataTable } from '@/components/DataTable';
import { apiUrl, fetchApiJson } from '@/lib/api';
import type { ApiComputeNamespace } from '@/lib/types';

/** Renders namespaces for a compute backend. */
export default function ComputeNamespaces() {
    const { compute = '' } = useParams();
    const namespacesUrl = apiUrl(`/api/compute/${encodeURIComponent(compute)}/namespaces`);

    const namespaceColumns: Array<ColumnDef<ApiComputeNamespace>> = [
        {
            accessorKey: 'name',
            header: 'Namespace',
            cell: ({ row }) => (
                <Link
                    to={`/admin/compute/${encodeURIComponent(compute)}/namespace/${encodeURIComponent(row.original.name)}`}
                    className="font-medium text-primary underline-offset-4 hover:underline"
                >
                    {row.original.name}
                </Link>
            ),
            meta: { className: 'min-w-56' },
        },
    ];

    const namespacesQuery = useQuery({
        queryKey: ['api', namespacesUrl],
        queryFn: async () => fetchApiJson<Array<ApiComputeNamespace>>(namespacesUrl, { credentials: 'include' }),
        retry: false,
        refetchOnMount: 'always',
    });

    const rows = namespacesQuery.data ?? [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <Hero icon={<Layers />}>
                    <div>
                        <HeroTitle>Namespaces</HeroTitle>
                        <HeroDescription>Namespaces managed by compute backend {compute}.</HeroDescription>
                    </div>
                </Hero>
            </div>
            <DataTable
                columns={namespaceColumns}
                data={rows}
                error={namespacesQuery.error}
                isLoading={namespacesQuery.isLoading}
                loadingLabel="Loading namespaces..."
            />
        </div>
    );
}
