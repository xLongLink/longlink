import { useQuery } from '@tanstack/react-query';

import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { Cpu } from 'lucide-react';

import ConnectComputeDialog from '@/components/dialogs/ConnectComputeDialog';
import { apiUrl } from '@/lib/api';
import type { ApiComputeRegistry, ApiResponse } from '@/lib/types';

import AdminPaginatedTable, { type AdminTableColumn } from './AdminPaginatedTable';

const computeColumns: Array<AdminTableColumn<ApiComputeRegistry>> = [
    { header: 'Kind', className: 'w-32', render: (compute) => compute.kind },
    { header: 'Name', render: (compute) => compute.name },
    { header: 'Kube config', className: 'w-64', render: (compute) => compute.kube_config_path },
    { header: 'Ingress host', className: 'w-48', render: (compute) => compute.ingress_host },
    { header: 'Ingress name', className: 'w-48', render: (compute) => compute.ingress_name },
];

/** Renders the admin compute page. */
export default function AdminCompute() {
    const computeUrl = apiUrl('/api/compute');

    const computeQuery = useQuery({
        queryKey: ['api', computeUrl],
        queryFn: async () => {
            const response = await fetch(computeUrl, {
                headers: { Accept: 'application/json' },
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error(`API request failed (${response.status})`);
            }

            const payload = (await response.json()) as ApiResponse<Array<ApiComputeRegistry>>;

            return payload.data ?? [];
        },
        retry: false,
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <Hero icon={<Cpu />}>
                    <div>
                        <HeroTitle>Compute</HeroTitle>
                        <HeroDescription>Inspect runtime workloads, node capacity, and orchestration status.</HeroDescription>
                    </div>
                </Hero>
                <ConnectComputeDialog />
            </div>
            <AdminPaginatedTable
                columns={computeColumns}
                rows={computeQuery.data ?? []}
                rowKey={(compute) => compute.name}
                emptyMessage="No compute nodes found."
                isLoading={computeQuery.isLoading}
                errorMessage={computeQuery.error?.message ?? null}
                pageSize={5}
            />
        </div>
    );
}
