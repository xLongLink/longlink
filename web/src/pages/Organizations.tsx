import { DataTable } from '@/components/DataTable';
import CreateOrganizationDialog from '@/components/dialogs/CreateOrganizationDialog';
import { SignInCard } from '@/components/SignInCard';
import { useUser } from '@/hooks/use-user';
import Layout from '@/layout/Layout';
import { type ColumnDef } from '@tanstack/react-table';
import { Avatar, AvatarFallback, AvatarImage } from '@ui/avatar';
import { Hero, HeroAction, HeroDescription, HeroTitle } from '@ui/hero';
import { Building2, Settings2 } from 'lucide-react';
import { Link, useLocation } from 'react-router';

import type { ApiUserOrganizationMembership } from '@/lib/types';

const organizationColumns: Array<ColumnDef<ApiUserOrganizationMembership>> = [
    {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row, getValue }) => (
            <div className="flex items-center gap-3">
                <Avatar shape="squircle" className="size-8 shrink-0">
                    <AvatarImage src={row.original.avatar ?? ''} alt={row.original.name} />
                    <AvatarFallback>{row.original.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                    <Link to={`/orgs/${row.original.slug}`} className="font-medium text-foreground hover:underline">
                        {getValue<string>()}
                    </Link>
                    <div className="truncate text-sm text-muted-foreground">
                        {row.original.location.country} · {row.original.location.name}
                    </div>
                </div>
            </div>
        ),
    },
    {
        accessorKey: 'role',
        header: 'Role',
        meta: { className: 'w-32' },
    },
];

/** Renders the organizations landing page for signed-in and anonymous users. */
export default function Organizations() {
    const { user, organizations, isLoading, error } = useUser();
    const location = useLocation();
    const nextPath = new URLSearchParams(location.search).get('next');
    const redirectTo = nextPath?.startsWith('/') ? nextPath : '/organizations';

    if (isLoading && !user) {
        return null;
    }

    if (!user) {
        return (
            <Layout brandOnly brandHref="/">
                <section className="mx-auto flex w-full max-w-[1000px] flex-1 items-center justify-center py-12">
                    <SignInCard redirectTo={redirectTo} />
                </section>
            </Layout>
        );
    }

    return (
        <Layout
            brandOnly
            brandHref="/"
            tabs={{
                Organizations: { href: '/organizations', icon: Building2 },
                Settings: { href: '/settings', icon: Settings2 },
            }}
        >
            <section className="mx-auto w-full max-w-[1000px] space-y-8">
                <Hero icon="building-2" className="w-full">
                    <div className="flex w-full items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <HeroTitle>Organizations</HeroTitle>
                            <HeroDescription>Manage the workspaces connected to your LongLink account.</HeroDescription>
                        </div>

                        <HeroAction>
                            <CreateOrganizationDialog />
                        </HeroAction>
                    </div>
                </Hero>

                {isLoading && organizations.length === 0 ? (
                    null
                ) : error && organizations.length === 0 ? (
                    <div className="rounded-md border p-4 text-sm text-destructive">Failed to load organizations.</div>
                ) : (
                    <DataTable columns={organizationColumns} data={organizations} />
                )}
            </section>
        </Layout>
    );
}
