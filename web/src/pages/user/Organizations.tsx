import { useMemo } from 'react';
import { Building2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
    Table as ViaVaiTable,
    type TableSchemaConfig,
} from '@/components/viavai/Table';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';
import { CreateOrganizationDialog } from '@/components/dialogs/create-organization-dialog';
import { useOrgs } from '@/hooks/use-orgs';

export default function Organizations() {
    const { orgs, isLoading, isCreating, error, createOrg } = useOrgs();

    const organizationsTableSchema = useMemo<TableSchemaConfig>(
        () => ({
            title: 'Organizations',
            schema: {
                columns: [
                    {
                        key: 'organization',
                        label: 'Organization',
                        cell: ['{name}', '{path}'],
                    },
                    {
                        key: 'country',
                        label: 'Country',
                        cell: ['{country}'],
                    },
                    {
                        key: 'created',
                        label: 'Created',
                        cell: ['{createdAt}'],
                    },
                ],
            },
        }),
        []
    );

    const organizationsTableData = useMemo(
        () =>
            orgs.map((org) => {
                const orgCountry = org.country?.toLowerCase() || 'us';
                const orgSlug = encodeURIComponent(org.name);
                const path = `/${orgCountry}/${orgSlug}`;

                return {
                    ...org,
                    country: org.country || 'No country set',
                    createdAt: org.date_creation
                        ? new Date(org.date_creation).toLocaleDateString()
                        : 'Unknown date',
                    path,
                };
            }),
        [orgs]
    );

    const orgCountLabel = useMemo(() => {
        if (isLoading) {
            return 'Loading organizations...';
        }
        const total = orgs.length;
        return `${total} organization${total === 1 ? '' : 's'}`;
    }, [isLoading, orgs.length]);

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/30">
                        <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">
                            Organizations
                        </h2>
                        <p className="text-sm text-white/60">{orgCountLabel}</p>
                    </div>
                </div>
                <CreateOrganizationDialog
                    createOrg={createOrg}
                    isCreating={isCreating}
                    error={error}
                />
            </div>

            {isLoading ? (
                <Card className="p-10 text-center">
                    <div className="flex flex-col items-center gap-3 text-sm text-white/60">
                        <Spinner className="h-5 w-5" />
                        Loading organizations...
                    </div>
                </Card>
            ) : orgs.length === 0 ? (
                <Card className="p-10 text-center">
                    <Empty>
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <Building2 />
                            </EmptyMedia>
                            <EmptyTitle>No Organizations Yet</EmptyTitle>
                            <EmptyDescription>
                                Create or join an organization to start managing
                                your workspaces and projects.
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                </Card>
            ) : (
                <ViaVaiTable
                    schema={organizationsTableSchema}
                    data={organizationsTableData}
                />
            )}
        </div>
    );
}
