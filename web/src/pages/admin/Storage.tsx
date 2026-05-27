import { useQuery } from '@tanstack/react-query';

import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { HardDrive } from 'lucide-react';

import ConnectStorageDialog from '@/components/dialogs/ConnectStorageDialog';
import { apiUrl } from '@/lib/api';
import type { ApiResponse, ApiStorageRegistry } from '@/lib/types';

import AdminPaginatedTable, { type AdminTableColumn } from './AdminPaginatedTable';

const storageColumns: Array<AdminTableColumn<ApiStorageRegistry>> = [
    { header: 'Kind', className: 'w-32', render: (storage) => storage.kind },
    { header: 'Name', render: (storage) => storage.name },
    { header: 'Protocol', className: 'w-32', render: (storage) => storage.protocol },
    { header: 'Endpoint', className: 'w-72', render: (storage) => storage.endpoint_url },
    { header: 'Access key', className: 'w-64', render: (storage) => storage.access_key_id },
];

/** Renders the admin storage page. */
export default function AdminStorage() {
    const storageUrl = apiUrl('/api/storage');

    const storageQuery = useQuery({
        queryKey: ['api', storageUrl],
        queryFn: async () => {
            const response = await fetch(storageUrl, {
                headers: { Accept: 'application/json' },
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error(`API request failed (${response.status})`);
            }

            const payload = (await response.json()) as ApiResponse<Array<ApiStorageRegistry>>;

            return payload.data ?? [];
        },
        retry: false,
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <Hero icon={<HardDrive />}>
                    <div>
                        <HeroTitle>Storage</HeroTitle>
                        <HeroDescription>Review file storage integrations and object storage configuration.</HeroDescription>
                    </div>
                </Hero>
                <ConnectStorageDialog />
            </div>
            <AdminPaginatedTable
                columns={storageColumns}
                rows={storageQuery.data ?? []}
                rowKey={(storage) => storage.name}
                emptyMessage="No storage providers found."
                isLoading={storageQuery.isLoading}
                errorMessage={storageQuery.error?.message ?? null}
                pageSize={5}
            />
        </div>
    );
}
