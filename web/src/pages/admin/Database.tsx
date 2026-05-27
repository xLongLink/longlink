import { useQuery } from '@tanstack/react-query';

import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { Database } from 'lucide-react';

import ConnectDatabaseDialog from '@/components/dialogs/ConnectDatabaseDialog';
import { apiUrl } from '@/lib/api';
import type { ApiDatabaseRegistry, ApiResponse } from '@/lib/types';

import AdminPaginatedTable, { type AdminTableColumn } from './AdminPaginatedTable';

const databaseColumns: Array<AdminTableColumn<ApiDatabaseRegistry>> = [
    { header: 'Kind', className: 'w-32', render: (database) => database.kind },
    { header: 'Name', render: (database) => database.name },
    { header: 'Host', className: 'w-56', render: (database) => database.host },
    { header: 'Port', className: 'w-24', render: (database) => database.port },
    { header: 'Username', className: 'w-40', render: (database) => database.username },
    { header: 'SSL', className: 'w-32', render: (database) => database.sslmode ?? 'default' },
    {
        header: 'Maintenance DB',
        className: 'w-44',
        render: (database) => database.maintenance_database,
    },
];

/** Renders the admin database page. */
export default function AdminDatabase() {
    const databaseUrl = apiUrl('/api/database');

    const databaseQuery = useQuery({
        queryKey: ['api', databaseUrl],
        queryFn: async () => {
            const response = await fetch(databaseUrl, {
                headers: { Accept: 'application/json' },
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error(`API request failed (${response.status})`);
            }

            const payload = (await response.json()) as ApiResponse<Array<ApiDatabaseRegistry>>;

            return payload.data ?? [];
        },
        retry: false,
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <Hero icon={<Database />}>
                    <div>
                        <HeroTitle>Database</HeroTitle>
                        <HeroDescription>Monitor control-plane data, schema health, and persistence state.</HeroDescription>
                    </div>
                </Hero>
                <ConnectDatabaseDialog />
            </div>
            <AdminPaginatedTable
                columns={databaseColumns}
                rows={databaseQuery.data ?? []}
                rowKey={(database) => database.name}
                emptyMessage="No database records found."
                isLoading={databaseQuery.isLoading}
                errorMessage={databaseQuery.error?.message ?? null}
                pageSize={5}
            />
        </div>
    );
}
