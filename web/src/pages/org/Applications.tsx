import { type ColumnDef } from '@tanstack/react-table';
import { Avatar, AvatarFallback, AvatarImage } from '@ui/avatar';
import { Link } from 'react-router';

import { DataTable } from '@/components/DataTable';
import { Icon } from '@/components/ui/icon';
import type { ApiOrganizationApplication } from '@/lib/types';

type ApplicationsProps = {
    organization: string;
    applications: ApiOrganizationApplication[];
    isLoading: boolean;
    error: Error | null;
};

/** Renders the organization applications table. */
export default function Applications({ organization, applications, isLoading, error }: ApplicationsProps) {
    const appColumns: Array<ColumnDef<ApiOrganizationApplication>> = [
        {
            accessorKey: 'name',
            header: 'Application',
            cell: ({ row, getValue }) => {
                const name = getValue<string>();
                const iconName = (row.original.icon ?? 'box').replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

                return (
                    <div className="flex items-start gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-accent/10 text-accent [&_svg]:size-4 [&_svg]:stroke-[2.5]">
                            <Icon name={iconName} className="size-4" />
                        </div>
                        <div className="min-w-0 space-y-1">
                            <Link
                                to={`/orgs/${organization}/apps/${row.original.slug}`}
                                className="font-medium text-foreground hover:underline"
                            >
                                {name}
                            </Link>
                            {row.original.description ? (
                                <p className="text-sm text-muted-foreground">{row.original.description}</p>
                            ) : null}
                        </div>
                    </div>
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
    ] satisfies Array<ColumnDef<ApiOrganizationApplication>>;

    return (
        <div className="space-y-4">
            {isLoading && applications.length === 0 ? null : error && applications.length === 0 ? (
                <div className="rounded-md border p-4 text-sm text-destructive">Failed to load applications.</div>
            ) : (
                <DataTable columns={appColumns} data={applications} />
            )}
        </div>
    );
}
