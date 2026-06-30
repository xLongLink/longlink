import { type ColumnDef } from '@tanstack/react-table';
import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { Link, useParams } from 'react-router';

import { DataTable } from '@/components/DataTable';
import { useComputeNamespaces } from '@/hooks/use-compute-namespaces';
import { useComputes } from '@/hooks/use-computes';
import type { ApiComputeNamespace } from '@/lib/types';

/** Renders namespaces for a compute backend. */
export default function ComputeNamespaces() {
    const { compute = '' } = useParams();

    const { items: computes, error: computeError, isLoading: computesIsLoading } = useComputes();

    const computeRegistry = computes.find((registry) => registry.slug === compute);

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

    const { items: rows, error: namespacesError, isLoading: namespacesIsLoading } = useComputeNamespaces(
        computeRegistry?.id ?? ''
    );
    const error =
        computeError ??
        (!computesIsLoading && !computeRegistry
            ? new Error(`Compute "${compute}" not found`)
            : namespacesError);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <Hero icon="layers">
                    <div>
                        <HeroTitle>Namespaces</HeroTitle>
                        <HeroDescription>
                            Namespaces managed by compute backend {computeRegistry?.slug || compute}.
                        </HeroDescription>
                    </div>
                </Hero>
            </div>
            <DataTable
                columns={namespaceColumns}
                data={rows}
                error={error}
                isLoading={computesIsLoading || namespacesIsLoading}
            />
        </div>
    );
}
