import { useTranslation } from '@/lib/i18n';
import { type ColumnDef } from '@tanstack/react-table';
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
    const { t } = useTranslation();
    const applicationsError = error ? new Error(t('errors.loadApplications')) : null;

    const appColumns: Array<ColumnDef<ApiOrganizationApplication>> = [
        {
            accessorKey: 'name',
            header: t('columns.application'),
            cell: ({ row, getValue }) => {
                const name = getValue<string>();

                return (
                    <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-accent/10 text-accent [&_svg]:size-4 [&_svg]:stroke-[2.5]">
                            <Icon name={row.original.icon ?? 'box'} className="size-4" />
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
    ] satisfies Array<ColumnDef<ApiOrganizationApplication>>;

    return <DataTable columns={appColumns} data={applications} error={applicationsError} isLoading={isLoading} />;
}
