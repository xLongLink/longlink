import { type ColumnDef } from '@tanstack/react-table';
import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { Layers } from 'lucide-react';
import { Link, useParams } from 'react-router';

import { DataTable } from '@/components/DataTable';
import { useApiQuery } from '@/hooks/use-api';
import type { ApiComputeNamespace, ApiComputeRegistry } from '@/lib/types';

/** Renders namespaces for a compute backend. */
export default function ComputeNamespaces() {
    const { compute = '' } = useParams();

    const computeQuery = useApiQuery<Array<ApiComputeRegistry>>('/api/compute', {
        retry: false,
        refetchOnMount: 'always',
    });

    const computeRegistry = computeQuery.data?.find((registry) => registry.slug === compute || registry.id === compute);
    const namespacesPath = computeRegistry ? `/api/compute/${computeRegistry.id}/namespaces` : null;

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

    const namespacesQuery = useApiQuery<Array<ApiComputeNamespace>>(namespacesPath ?? `/api/compute/__missing__/${compute}`, {
        enabled: Boolean(namespacesPath),
        retry: false,
        refetchOnMount: 'always',
    });

    const rows = namespacesQuery.data ?? [];
    const error =
        computeQuery.error ??
        (!computeQuery.isLoading && !computeRegistry ? new Error(`Compute "${compute}" not found`) : namespacesQuery.error);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <Hero icon={<Layers />}>
                    <div>
                        <HeroTitle>Namespaces</HeroTitle>
                        <HeroDescription>Namespaces managed by compute backend {computeRegistry?.slug || compute}.</HeroDescription>
                    </div>
                </Hero>
            </div>
            <DataTable
                columns={namespaceColumns}
                data={rows}
                error={error}
                isLoading={computeQuery.isLoading || namespacesQuery.isLoading}
                loadingLabel="Loading namespaces..."
            />
        </div>
    );
}
