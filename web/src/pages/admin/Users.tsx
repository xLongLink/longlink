import { useQuery } from '@tanstack/react-query';

import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@ui/dropdown-menu';
import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { MoreHorizontal, Users } from 'lucide-react';
import { toast } from 'sonner';

import { DataTable } from '@/components/DataTable';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { apiUrl } from '@/lib/api';
import type { ApiResponse, ApiUserSummary } from '@/lib/types';

const userColumns: Array<ColumnDef<ApiUserSummary>> = [
    {
        id: 'user',
        header: 'User',
        meta: { className: 'pr-1' },
        cell: ({ row }) => {
            const user = row.original;

            return (
                <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">{user.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                    </div>
                </div>
            );
        },
    },
    {
        accessorKey: 'id',
        header: 'ID',
        cell: ({ row, getValue }) => (
            <div className="flex flex-col leading-tight text-left">
                <span className="font-medium text-foreground">#{getValue<number>()}</span>
                <span className="text-xs text-muted-foreground">#{row.original.oidc_subject ?? '—'}</span>
            </div>
        ),
        meta: { className: 'w-28 pl-1 text-left' },
    },
    {
        accessorKey: 'admin',
        header: 'Admin',
        cell: ({ getValue }) => (getValue() ? 'Yes' : 'No'),
        meta: { className: 'w-24' },
    },
    {
        id: 'actions',
        header: 'Action',
        meta: { className: 'w-24 text-right' },
        cell: ({ row }) => {
            const user = row.original;

            return (
                <div className="flex justify-end">
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            render={
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={`Open actions for ${user.name}`}
                                />
                            }
                        >
                            <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => {
                                    void navigator.clipboard.writeText(user.email);
                                    toast.success('Email copied');
                                }}
                            >
                                Copy email
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="cursor-pointer"
                                disabled={!user.oidc_subject}
                                onClick={() => {
                                    if (!user.oidc_subject) {
                                        return;
                                    }

                                    void navigator.clipboard.writeText(user.oidc_subject);
                                    toast.success('OIDC subject copied');
                                }}
                            >
                                Copy OIDC
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            );
        },
    },
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

    const usersRows = usersQuery.data ?? [];

    return (
        <div className="space-y-6">
            <Hero icon={<Users />}>
                <div>
                    <HeroTitle>Users</HeroTitle>
                    <HeroDescription>Review account access, elevated users, and admin onboarding.</HeroDescription>
                </div>
            </Hero>
            {usersQuery.isLoading && usersRows.length === 0 ? (
                <div className="rounded-md border p-4 text-sm text-muted-foreground">Loading records...</div>
            ) : usersQuery.error && usersRows.length === 0 ? (
                <div className="rounded-md border p-4 text-sm text-destructive">{usersQuery.error.message}</div>
            ) : (
                <DataTable columns={userColumns} data={usersRows} />
            )}
        </div>
    );
}
