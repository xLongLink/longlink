import Layout from '@/Layout';
import { DataTable } from '@/components/DataTable';
import CreateOrgDialog from '@/components/dialogs/CreateOrgDialog';
import { useUser } from '@/hooks/use-user';
import { type ColumnDef } from '@tanstack/react-table';
import { Hero, HeroAction, HeroDescription, HeroTitle } from '@ui/hero';
import { Blocks } from 'lucide-react';
import { Link } from 'react-router';

import type { ApiUserOrgMembership } from '@/lib/types';

const organizationColumns: Array<ColumnDef<ApiUserOrgMembership>> = [
    {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ getValue }) => <span className="font-medium text-foreground">{getValue<string>()}</span>,
    },
    {
        accessorKey: 'role',
        header: 'Role',
        meta: { className: 'w-32' },
    },
    {
        id: 'open',
        header: 'Open',
        meta: { className: 'w-32' },
        cell: ({ row }) => (
            <Link to={`/${row.original.name}`} className="text-sm text-accent hover:underline">
                Open
            </Link>
        ),
    },
];

/** Renders the authenticated organizations landing page. */
export default function Organizations() {
    const { orgs, isLoading, error } = useUser();

    return (
        <Layout brandOnly brandHref="/">
            <section className="mx-auto w-full max-w-[1000px] space-y-8">
                <Hero icon={<Blocks />} className="w-full">
                    <div className="flex w-full items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <HeroTitle>Organizations</HeroTitle>
                            <HeroDescription>Manage the workspaces connected to your LongLink account.</HeroDescription>
                        </div>

                        <HeroAction>
                            <CreateOrgDialog />
                        </HeroAction>
                    </div>
                </Hero>

                {isLoading && orgs.length === 0 ? (
                    <div className="rounded-md border p-4 text-sm text-muted-foreground">Loading orgs...</div>
                ) : error && orgs.length === 0 ? (
                    <div className="rounded-md border p-4 text-sm text-destructive">Failed to load orgs.</div>
                ) : (
                    <DataTable columns={organizationColumns} data={orgs} />
                )}
            </section>
        </Layout>
    );
}
