import { useOrganization } from '@/hooks/use-organization';
import { useUser } from '@/hooks/use-user';
import Layout from '@/layout/Layout';
import { Avatar, AvatarFallback, AvatarImage } from '@ui/avatar';
import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { LayoutGrid, Settings2, Users } from 'lucide-react';
import { Link, useParams } from 'react-router';

import NotFound from '../NotFound';

/** Renders an organization member detail page. */
export default function Person() {
    const { organization: routeOrganization = '', person: personId = '' } = useParams();
    const { organizations } = useUser();
    const organization = routeOrganization || organizations[0]?.slug || '';
    const { organization: organizationDetails, people, isLoading, error } = useOrganization(organization);
    const person = people.find((item) => item.id === personId || item.name === personId);

    // Hide missing or inaccessible orgs and people behind the shared 404 page.
    if (error?.status === 404 || (!isLoading && personId.length > 0 && !person)) {
        return <NotFound />;
    }

    return (
        <Layout
            tabs={{
                Applications: { href: `/orgs/${organization}`, icon: LayoutGrid },
                People: { href: `/orgs/${organization}/people`, icon: Users },
                Settings: { href: `/orgs/${organization}/settings`, icon: Settings2 },
            }}
        >
            <section className="mx-auto w-full max-w-[1000px] space-y-8">
                <Hero icon={<Users />} className="w-full">
                    <div className="flex w-full items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <HeroTitle>{person?.name ?? 'Person'}</HeroTitle>
                            <HeroDescription>{person?.email ?? 'Organization member details.'}</HeroDescription>
                        </div>
                    </div>
                </Hero>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
                    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                        <div className="flex items-start gap-4">
                            <Avatar className="size-14">
                                <AvatarImage
                                    src={person?.avatar ?? ''}
                                    alt={person?.name ? `${person.name} avatar` : ''}
                                />
                                <AvatarFallback>{person?.name?.slice(0, 2).toUpperCase() ?? '??'}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 space-y-1">
                                <div className="text-lg font-semibold text-foreground">{person?.name ?? 'Unknown'}</div>
                                <div className="text-sm text-muted-foreground">{person?.email ?? '—'}</div>
                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                    <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium capitalize text-muted-foreground">
                                        {person?.role ?? '—'}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        Last access{' '}
                                        {person?.last_access_at
                                            ? new Date(person.last_access_at).toLocaleString()
                                            : '—'}
                                    </span>
                                </div>
                                <Link
                                    to={`/orgs/${organization}/people`}
                                    className="inline-flex text-sm font-medium text-foreground hover:underline"
                                >
                                    Back to people
                                </Link>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                        <div className="space-y-4">
                            <div>
                                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                    Organization
                                </div>
                                <div className="mt-1 text-sm font-medium text-foreground">
                                    {organizationDetails?.name ?? organization}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Role</div>
                                <div className="mt-1 text-sm font-medium text-foreground">{person?.role ?? '—'}</div>
                            </div>
                            <div>
                                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">ID</div>
                                <div className="mt-1 break-all text-sm font-medium text-foreground">
                                    {person?.id ?? '—'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </Layout>
    );
}
