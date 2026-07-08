import { DataTable } from '@/components/DataTable';
import CreateOrganizationDialog from '@/components/dialogs/CreateOrganizationDialog';
import { SignInCard } from '@/components/SignInCard';
import { useUserProfile } from '@/hooks/use-user';
import Layout from '@/layout/Layout';
import { useTranslation } from '@/lib/i18n';
import { sanitizeRedirectPath } from '@/lib/redirects';
import { getInitials } from '@/lib/utils';
import { type ColumnDef } from '@tanstack/react-table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Hero, HeroAction, HeroDescription, HeroTitle } from '@/components/ui/hero';
import { Building2, Settings2 } from 'lucide-react';
import { Link, useLocation } from 'react-router';

import type { ApiUserOrganizationMembership } from '@/lib/types';

/** Renders the organizations landing page for signed-in and anonymous users. */
export default function Organizations() {
    const { t } = useTranslation();
    const { user, organizations, isLoading, error } = useUserProfile();
    const location = useLocation();
    const nextPath = new URLSearchParams(location.search).get('next');
    const redirectTo = sanitizeRedirectPath(nextPath);

    if (!user) {
        return (
            <Layout brandOnly brandHref="/">
                <section className="mx-auto flex w-full max-w-[1000px] flex-1 items-center justify-center py-12">
                    <SignInCard redirectTo={redirectTo} />
                </section>
            </Layout>
        );
    }

    const organizationColumns: Array<ColumnDef<ApiUserOrganizationMembership>> = [
        {
            accessorKey: 'name',
            header: t('columns.name'),
            cell: ({ row, getValue }) => (
                <div className="flex items-center gap-3">
                    <Avatar shape="squircle" className="size-9 shrink-0">
                        <AvatarImage src={row.original.avatar ?? ''} alt={row.original.name} />
                        <AvatarFallback>{getInitials(row.original.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <Link to={`/orgs/${row.original.slug}`} className="font-medium text-foreground hover:underline">
                            {getValue<string>()}
                        </Link>
                        <div className="truncate text-sm text-muted-foreground">
                            {row.original.country} · {row.original.location.name}
                        </div>
                    </div>
                </div>
            ),
        },
    ];

    return (
        <Layout
            brandOnly
            brandHref="/"
            tabs={{
                [t('navigation.organizations')]: { href: '/organizations', icon: Building2 },
                [t('navigation.settings')]: { href: '/settings', icon: Settings2 },
            }}
        >
            <section className="mx-auto w-full max-w-[1000px] space-y-8">
                <Hero icon="building-2" className="w-full">
                    <div className="flex w-full items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <HeroTitle>{t('organizations.title')}</HeroTitle>
                            <HeroDescription>{t('organizations.description')}</HeroDescription>
                        </div>

                        <HeroAction>
                            <CreateOrganizationDialog />
                        </HeroAction>
                    </div>
                </Hero>

                {isLoading && organizations.length === 0 ? null : error && organizations.length === 0 ? (
                    <div className="rounded-md border p-4 text-sm text-destructive">
                        {t('errors.loadOrganizations')}
                    </div>
                ) : (
                    <DataTable columns={organizationColumns} data={organizations} />
                )}
            </section>
        </Layout>
    );
}
