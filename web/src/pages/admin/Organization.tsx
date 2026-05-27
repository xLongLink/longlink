import { useQuery } from '@tanstack/react-query';

import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { Building2 } from 'lucide-react';

import { apiUrl } from '@/lib/api';
import type { ApiOrgSummary, ApiResponse } from '@/lib/types';

import AdminPaginatedTable, { type AdminTableColumn } from './AdminPaginatedTable';

const organizationColumns: Array<AdminTableColumn<ApiOrgSummary>> = [
    { header: 'Name', render: (organization) => organization.name },
    {
        header: 'Created by',
        className: 'w-48',
        render: (organization) => organization.created_by.name,
    },
    {
        header: 'Created',
        className: 'w-44',
        render: (organization) => new Date(organization.created_at).toLocaleString(),
    },
    {
        header: 'Updated',
        className: 'w-44',
        render: (organization) => new Date(organization.updated_at).toLocaleString(),
    },
    {
        header: 'Deleted',
        className: 'w-44',
        render: (organization) =>
            organization.deleted_at ? new Date(organization.deleted_at).toLocaleString() : '—',
    },
];

/** Renders the admin organizations page. */
export default function AdminOrganization() {
    const organizationsUrl = apiUrl('/api/orgs');

    const organizationsQuery = useQuery({
        queryKey: ['api', organizationsUrl],
        queryFn: async () => {
            const response = await fetch(organizationsUrl, {
                headers: { Accept: 'application/json' },
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error(`API request failed (${response.status})`);
            }

            const payload = (await response.json()) as ApiResponse<Array<ApiOrgSummary>>;

            return payload.data ?? [];
        },
        retry: false,
    });

    return (
        <div className="space-y-6">
            <Hero icon={<Building2 />}>
                <div>
                    <HeroTitle>Organizations</HeroTitle>
                    <HeroDescription>Review organization lifecycle, ownership, and access boundaries.</HeroDescription>
                </div>
            </Hero>
            <AdminPaginatedTable
                columns={organizationColumns}
                rows={organizationsQuery.data ?? []}
                rowKey={(organization) => organization.name}
                emptyMessage="No organizations found."
                isLoading={organizationsQuery.isLoading}
                errorMessage={organizationsQuery.error?.message ?? null}
                pageSize={5}
            />
        </div>
    );
}
