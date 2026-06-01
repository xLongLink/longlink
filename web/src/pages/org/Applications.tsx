import { type ColumnDef } from '@tanstack/react-table';
import { Avatar, AvatarFallback, AvatarImage } from '@ui/avatar';
import { Link } from 'react-router';

import { DataTable } from '@/components/DataTable';
import type { ApiOrgApp } from '@/lib/types';

type ApplicationsProps = {
    org: string;
    apps: ApiOrgApp[];
    isLoading: boolean;
    error: Error | null;
};

/** Renders the organization applications table. */
export default function Applications({ org, apps, isLoading, error }: ApplicationsProps) {
    const appColumns: Array<ColumnDef<ApiOrgApp>> = [
        {
            accessorKey: 'name',
            header: 'App',
            cell: ({ row, getValue }) => {
                const name = getValue<string>();

                return (
                    <Link to={`/${org}/${name}`} className="font-medium text-foreground hover:underline">
                        {name}
                    </Link>
                );
            },
        },
        {
            accessorKey: 'url',
            header: 'URL',
            cell: ({ getValue }) => {
                const url = getValue<string>();

                return url ? (
                    <a href={url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:underline">
                        {url}
                    </a>
                ) : (
                    '—'
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
    ] satisfies Array<ColumnDef<ApiOrgApp>>;

    return (
        <>
            {isLoading && apps.length === 0 ? (
                <div className="rounded-md border p-4 text-sm text-muted-foreground">Loading apps...</div>
            ) : error && apps.length === 0 ? (
                <div className="rounded-md border p-4 text-sm text-destructive">Failed to load apps.</div>
            ) : (
                <DataTable columns={appColumns} data={apps} />
            )}
        </>
    );
}
