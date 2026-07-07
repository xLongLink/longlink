import { DataTable } from '@/components/DataTable';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Hero, HeroDescription, HeroTitle } from '@/components/ui/hero';
import { Icon } from '@/components/ui/icon';
import { useApplications, useLocations } from '@/data/admin';
import { useTranslation } from '@/lib/i18n';
import type { ApiApplicationResponse, ApiLocation } from '@/lib/types';
import { formatDateTime, getInitials } from '@/lib/utils';
import { type ColumnDef } from '@tanstack/react-table';
import type { TFunction } from 'i18next';
import { Link } from 'react-router';

type AdminApplicationResponse = ApiApplicationResponse & {
    organization: ApiApplicationResponse['organization'] & { location?: ApiLocation };
};

/** Builds localized admin application table columns. */
function createAppColumns(t: TFunction): Array<ColumnDef<AdminApplicationResponse>> {
    return [
        {
            accessorKey: 'name',
            header: t('columns.application'),
            cell: ({ row, getValue }) => {
                const app = row.original;

                return (
                    <div className="flex items-start gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-accent/10 text-accent [&_svg]:size-4 [&_svg]:stroke-[2.5]">
                            <Icon name={app.icon ?? 'box'} className="size-4" />
                        </div>
                        <div className="min-w-0 space-y-1">
                            <Link
                                to={`/orgs/${app.organization.slug}/apps/${app.slug}`}
                                className="font-medium text-foreground hover:underline"
                            >
                                {getValue<string>()}
                            </Link>
                            {app.description ? (
                                <p className="text-sm text-muted-foreground">{app.description}</p>
                            ) : null}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'organization',
            header: t('columns.organization'),
            cell: ({ row, getValue }) => {
                const organization = getValue<ApiApplicationResponse['organization']>();

                return (
                    <div className="flex items-center gap-3">
                        <Avatar shape="squircle" className="size-9 shrink-0">
                            <AvatarImage src={organization.avatar ?? ''} alt={organization.name} />
                            <AvatarFallback>{getInitials(organization.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <Link
                                to={`/orgs/${organization.slug}`}
                                className="font-medium text-foreground hover:underline"
                            >
                                {organization.name}
                            </Link>
                            <div className="truncate text-sm text-muted-foreground">
                                {row.original.organization.location?.country ?? t('common.unknownLocation')}
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
            header: t('columns.status'),
            cell: ({ getValue }) => <Badge variant="outline">{getValue<string>()}</Badge>,
            meta: { className: 'w-32' },
        },
        {
            accessorKey: 'image',
            header: t('columns.image'),
            cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{getValue<string>()}</span>,
            meta: { className: 'min-w-72' },
        },
        {
            accessorKey: 'created_at',
            header: t('columns.created'),
            cell: ({ getValue }) => formatDateTime(getValue<string>()),
            meta: { className: 'w-52' },
        },
    ];
}

/** Renders the admin applications page. */
export default function AdminApplications() {
    const { t } = useTranslation();
    const { items: applications, error: applicationsError, isLoading: applicationsIsLoading } = useApplications();
    const { items: locations, error: locationsError, isLoading: locationsIsLoading } = useLocations();
    const appColumns = createAppColumns(t);

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
                    <HeroTitle>{t('admin.applicationsTitle')}</HeroTitle>
                    <HeroDescription>{t('admin.applicationsDescription')}</HeroDescription>
                </div>
            </Hero>
            <DataTable
                columns={appColumns}
                data={appRows}
                error={applicationsError ?? locationsError}
                isLoading={applicationsIsLoading || locationsIsLoading}
                pageSize={25}
            />
        </div>
    );
}
