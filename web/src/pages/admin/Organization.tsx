import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@ui/dropdown-menu';
import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { Building2, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router';

import { DataTable } from '@/components/DataTable';
import { apiUrl } from '@/lib/api';
import type { ApiOrgSummary, ApiResponse } from '@/lib/types';

const organizationColumnsBase: Array<ColumnDef<ApiOrgSummary>> = [
    {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row, getValue }) => {
            const name = getValue<string>();

            return (
                <Link to={`/${row.original.name}`} className="font-medium text-foreground hover:underline">
                    {name}
                </Link>
            );
        },
    },
    {
        id: 'created_by',
        header: 'Created by',
        cell: ({ row }) => {
            const createdBy = row.original.created_by;

            if (!createdBy) {
                return '—';
            }

            return (
                <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                        <AvatarImage src={createdBy.avatar} alt={createdBy.name} />
                        <AvatarFallback>{createdBy.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">{createdBy.name}</div>
                        <div className="truncate text-xs text-muted-foreground">
                            {new Date(row.original.created_at).toLocaleString()}
                        </div>
                    </div>
                </div>
            );
        },
        meta: { className: 'w-64' },
    },
    {
        id: 'updated_by',
        header: 'Updated by',
        cell: ({ row }) => {
            const updatedBy = row.original.updated_by;

            if (!updatedBy) {
                return '—';
            }

            return (
                <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                        <AvatarImage src={updatedBy.avatar} alt={updatedBy.name} />
                        <AvatarFallback>{updatedBy.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">{updatedBy.name}</div>
                        <div className="truncate text-xs text-muted-foreground">
                            {new Date(row.original.updated_at).toLocaleString()}
                        </div>
                    </div>
                </div>
            );
        },
        meta: { className: 'w-64' },
    },
    {
        id: 'deleted_by',
        header: 'Deleted by',
        cell: ({ row }) => {
            const deletedBy = row.original.deleted_by;

            if (!deletedBy) {
                return '—';
            }

            return (
                <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                        <AvatarImage src={deletedBy.avatar} alt={deletedBy.name} />
                        <AvatarFallback>{deletedBy.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">{deletedBy.name}</div>
                        <div className="truncate text-xs text-muted-foreground">
                            {row.original.deleted_at ? new Date(row.original.deleted_at).toLocaleString() : '—'}
                        </div>
                    </div>
                </div>
            );
        },
        meta: { className: 'w-64' },
    },
];

/** Renders the admin organizations page. */
export default function AdminOrganization() {
    const queryClient = useQueryClient();
    const organizationsUrl = apiUrl('/api/orgs');

    const deleteOrganization = useMutation({
        mutationFn: async (name: string) => {
            const response = await fetch(apiUrl(`/api/orgs/${encodeURIComponent(name)}`), {
                method: 'DELETE',
                headers: { Accept: 'application/json' },
                credentials: 'include',
            });

            if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as { detail?: string } | null;

                throw new Error(payload?.detail ?? `API request failed (${response.status})`);
            }

            return null;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['api', organizationsUrl] });
            toast.success('Organization deleted');
        },
    });

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
        refetchOnMount: 'always',
    });

    const organizationRows = organizationsQuery.data ?? [];
    const organizationColumns = [
        ...organizationColumnsBase,
        {
            id: 'actions',
            header: 'Action',
            meta: { className: 'w-24 text-right' },
            cell: ({ row }) => {
                const organization = row.original;

                return (
                    <div className="flex justify-end">
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label={`Open actions for ${organization.name}`}
                                    />
                                }
                            >
                                <MoreHorizontal className="size-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem
                                    className="cursor-pointer"
                                    onClick={() => {
                                        void navigator.clipboard.writeText(organization.name);
                                        toast.success('Organization name copied');
                                    }}
                                >
                                    Copy name
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="cursor-pointer"
                                    variant="destructive"
                                    onClick={async () => {
                                        // Confirm the destructive action before deleting the organization.
                                        if (!window.confirm(`Delete organization ${organization.name}?`)) {
                                            return;
                                        }

                                        try {
                                            await deleteOrganization.mutateAsync(organization.name);
                                        } catch (mutationError) {
                                            toast.error(
                                                mutationError instanceof Error
                                                    ? mutationError.message
                                                    : 'Failed to delete organization'
                                            );
                                        }
                                    }}
                                >
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                );
            },
        },
    ] satisfies Array<ColumnDef<ApiOrgSummary>>;

    return (
        <div className="space-y-6">
            <Hero icon={<Building2 />}>
                <div>
                    <HeroTitle>Organizations</HeroTitle>
                    <HeroDescription>Review organization lifecycle, ownership, and access boundaries.</HeroDescription>
                </div>
            </Hero>
            {organizationsQuery.isLoading && organizationRows.length === 0 ? (
                <div className="rounded-md border p-4 text-sm text-muted-foreground">Loading records...</div>
            ) : organizationsQuery.error && organizationRows.length === 0 ? (
                <div className="rounded-md border p-4 text-sm text-destructive">{organizationsQuery.error.message}</div>
            ) : (
                <DataTable columns={organizationColumns} data={organizationRows} />
            )}
        </div>
    );
}
