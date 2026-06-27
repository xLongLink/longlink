import { DataTable } from '@/components/DataTable';
import { useApplications } from '@/hooks/use-applications';
import { useLocations } from '@/hooks/use-locations';
import type { ApiApplicationResponse, ApiLocation } from '@/lib/types';
import { type ColumnDef } from '@tanstack/react-table';
import { Avatar, AvatarFallback, AvatarImage } from '@ui/avatar';
import { Badge } from '@ui/badge';
import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { Boxes } from 'lucide-react';
import { DynamicIcon } from 'lucide-react/dynamic';
import { Link } from 'react-router';

type AdminApplicationResponse = ApiApplicationResponse & {
    organization: ApiApplicationResponse['organization'] & { location?: ApiLocation };
};

const appColumns: Array<ColumnDef<AdminApplicationResponse>> = [
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
                            to={`/orgs/${app.organization.slug}/apps/${app.slug}`}
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
        cell: ({ row, getValue }) => {
            const organization = getValue<ApiApplicationResponse['organization']>();

            return (
                <div className="flex items-center gap-3">
                    <Avatar shape="squircle" className="size-9 shrink-0">
                        <AvatarImage src={organization.avatar ?? ''} alt={organization.name} />
                        <AvatarFallback>{organization.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <Link to={`/orgs/${organization.slug}`} className="font-medium text-foreground hover:underline">
                            {organization.name}
                        </Link>
                        <div className="truncate text-sm text-muted-foreground">
                            {row.original.organization.location?.country ?? 'Unknown location'}
                            {row.original.organization.location?.name
                                ? ` · ${row.original.organization.location.name}`
                                : ''}
                        </div>
                    </div>
                </div>
            );
        },
        meta: { className: 'min-w-64' },
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
    const { items: applications, error: applicationsError, isLoading: applicationsIsLoading } = useApplications();
    const { items: locations, error: locationsError, isLoading: locationsIsLoading } = useLocations();

    // Resolve each application's organization location so the table can show the full organization context.
    const locationById = new Map(locations.map((location) => [location.id, location]));
    const appRows = applications.map((row) => ({
        ...row,
        organization: {
            ...row.organization,
            location: row.organization.location_id ? locationById.get(row.organization.location_id) : undefined,
        },
    }));

    return (
        <div className="space-y-6">
            <Hero icon="boxes">
                <div>
                    <HeroTitle>Applications</HeroTitle>
                    <HeroDescription>
                        Review all applications across organizations and deployment states.
                    </HeroDescription>
                </div>
            </Hero>
            <DataTable
                columns={appColumns}
                data={appRows}
                error={applicationsError ?? locationsError}
                isLoading={applicationsIsLoading || locationsIsLoading}
            />
        </div>
    );
}
