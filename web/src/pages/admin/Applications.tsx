import { useQuery } from '@tanstack/react-query';

import { DataTable } from '@/components/DataTable';
import { apiUrl, fetchApiJson } from '@/lib/api';
import type { ApiAppResponse } from '@/lib/types';
import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@ui/badge';
import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { Boxes } from 'lucide-react';
import { DynamicIcon } from 'lucide-react/dynamic';
import { Link } from 'react-router';

const appColumns: Array<ColumnDef<ApiAppResponse>> = [
    {
        accessorKey: 'name',
        header: 'Application',
        cell: ({ row, getValue }) => {
            const app = row.original;
            const iconName = (app.icon ?? 'box').replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

            return (
                <div className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-accent/10 text-accent [&_svg]:size-4 [&_svg]:stroke-[2.5]">
                        <DynamicIcon
                            name={iconName as Parameters<typeof DynamicIcon>[0]['name']}
                            aria-hidden={true}
                            className="size-4"
                        />
                    </div>
                    <div className="min-w-0 space-y-1">
                        <Link
                            to={`/orgs/${app.organization}/apps/${app.name}`}
                            className="font-medium text-foreground hover:underline"
                        >
                            {getValue<string>()}
                        </Link>
                        {app.description ? <p className="text-sm text-muted-foreground">{app.description}</p> : null}
                    </div>
                </div>
            );
        },
    },
    {
        accessorKey: 'organization',
        header: 'Organization',
        cell: ({ getValue }) => {
            const organization = getValue<string>();

            return (
                <Link to={`/orgs/${organization}`} className="font-medium text-foreground hover:underline">
                    {organization}
                </Link>
            );
        },
        meta: { className: 'w-40' },
    },
    {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <Badge variant="outline">{getValue<string>()}</Badge>,
        meta: { className: 'w-32' },
    },
    {
        accessorKey: 'image',
        header: 'Image',
        cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{getValue<string>()}</span>,
        meta: { className: 'min-w-72' },
    },
    {
        accessorKey: 'created_at',
        header: 'Created',
        cell: ({ getValue }) => new Date(getValue<string>()).toLocaleString(),
        meta: { className: 'w-52' },
    },
];

/** Renders the admin applications page. */
export default function AdminApplications() {
    const appsUrl = apiUrl('/api/apps');

    const appsQuery = useQuery({
        queryKey: ['api', appsUrl],
        queryFn: async () => fetchApiJson<Array<ApiAppResponse>>(appsUrl, { credentials: 'include' }),
        retry: false,
        refetchOnMount: 'always',
    });

    return (
        <div className="space-y-6">
            <Hero icon={<Boxes />}>
                <div>
                    <HeroTitle>Applications</HeroTitle>
                    <HeroDescription>Review all applications across organizations and deployment states.</HeroDescription>
                </div>
            </Hero>
            <DataTable
                columns={appColumns}
                data={appsQuery.data ?? []}
                error={appsQuery.error}
                isLoading={appsQuery.isLoading}
            />
        </div>
    );
}
