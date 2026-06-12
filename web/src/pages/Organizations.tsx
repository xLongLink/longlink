import { DataTable } from '@/components/DataTable';
import CreateOrgDialog from '@/components/dialogs/CreateOrgDialog';
import { SignInCard } from '@/components/SignInCard';
import { useUser } from '@/hooks/use-user';
import Layout from '@/layout/Layout';
import { type ColumnDef } from '@tanstack/react-table';
import { Hero, HeroAction, HeroDescription, HeroTitle } from '@ui/hero';
import { Skeleton } from '@ui/skeleton';
import { Building2, Settings2 } from 'lucide-react';
import { Link, useLocation } from 'react-router';

import type { ApiUserOrgMembership } from '@/lib/types';

const organizationColumns: Array<ColumnDef<ApiUserOrgMembership>> = [
    {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row, getValue }) => (
            <Link to={`/orgs/${row.original.id}`} className="font-medium text-foreground hover:underline">
                {getValue<string>()}
            </Link>
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
    const { user, orgs, isLoading, error } = useUser();
    const location = useLocation();
    const nextPath = new URLSearchParams(location.search).get('next');
    const redirectTo = nextPath?.startsWith('/') ? nextPath : '/organizations';

    if (isLoading && !user) {
        return (
            <Layout brandOnly brandHref="/">
                <OrganizationsSkeleton />
            </Layout>
        );
    }

    if (!user) {
        return (
            <Layout brandOnly brandHref="/">
                <section className="mx-auto flex w-full max-w-[1000px] items-center justify-center py-12">
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
                <Hero icon={<Building2 />} className="w-full">
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

/** Renders the organizations page skeleton while the session is resolving. */
function OrganizationsSkeleton() {
    return (
        <section className="mx-auto w-full max-w-[1000px] space-y-8">
            <div className="space-y-3 rounded-lg border border-border bg-card/80 p-6 shadow-sm">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-[28rem] max-w-full" />
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
                <div className="space-y-3 rounded-lg border border-border bg-card/80 p-4 shadow-sm">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-32" />
                </div>

                <div className="space-y-3 rounded-lg border border-border bg-card/80 p-4 shadow-sm">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-10 w-full" />
                </div>
            </div>
        </section>
    );
}
