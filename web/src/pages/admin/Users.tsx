import { useQuery } from '@tanstack/react-query';

import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { Users } from 'lucide-react';

import { apiUrl } from '@/lib/api';
import type { ApiResponse, ApiUserSummary } from '@/lib/types';

import AdminPaginatedTable, { type AdminTableColumn } from './AdminPaginatedTable';

const userColumns: Array<AdminTableColumn<ApiUserSummary>> = [
    { header: 'ID', className: 'w-20', render: (user) => user.id },
    { header: 'Name', render: (user) => user.name },
    { header: 'Email', className: 'w-64', render: (user) => user.email },
    { header: 'Admin', className: 'w-24', render: (user) => (user.admin ? 'Yes' : 'No') },
];

/** Renders the admin users page. */
export default function AdminUsers() {
    const usersUrl = apiUrl('/api/users');

    const usersQuery = useQuery({
        queryKey: ['api', usersUrl],
        queryFn: async () => {
            const response = await fetch(usersUrl, {
                headers: { Accept: 'application/json' },
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error(`API request failed (${response.status})`);
            }

            const payload = (await response.json()) as ApiResponse<Array<ApiUserSummary>>;

            return payload.data ?? [];
        },
        retry: false,
    });

    return (
        <div className="space-y-6">
            <Hero icon={<Users />}>
                <div>
                    <HeroTitle>Users</HeroTitle>
                    <HeroDescription>Review account access, elevated users, and admin onboarding.</HeroDescription>
                </div>
            </Hero>
            <AdminPaginatedTable
                columns={userColumns}
                rows={usersQuery.data ?? []}
                rowKey={(user) => user.email}
                emptyMessage="No users found."
                isLoading={usersQuery.isLoading}
                errorMessage={usersQuery.error?.message ?? null}
                pageSize={5}
            />
        </div>
    );
}
