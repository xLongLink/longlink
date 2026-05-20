import { UserProfile } from '@/components/Profile';
import { useQuery } from '@tanstack/react-query';
import { buttonVariants } from '@ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card';
import startCase from 'lodash/startCase';
import { ArrowRight, Blocks, CircleAlert, FolderOpen } from 'lucide-react';
import { Link, useParams } from 'react-router';

type OrganizationMetadataResponse = {
    organization?: {
        name: string;
    };
};

type AppSummary = {
    name: string;
    url: string;
};

/** Renders the organization dashboard for one authenticated workspace. */
export default function Organization() {
    const { org: orgParam } = useParams();
    const org = orgParam ?? '';

    // Load the organization record first so the page can render a real 404 state.
    const {
        data: organizationData,
        isLoading: organizationLoading,
        error: organizationError,
    } = useQuery({
        queryKey: ['api', '/api/organizations/:org', org],
        queryFn: async () => {
            const response = await fetch(`/api/organizations/${org}`, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });

            if (response.status === 404) {
                return null;
            }

            if (!response.ok) {
                throw new Error(`API request failed (${response.status})`);
            }

            return (await response.json()) as OrganizationMetadataResponse;
        },
        enabled: org.length > 0,
    });

    // Load the current app inventory for this organization.
    const {
        data: appsData,
        isLoading: appsLoading,
        error: appsError,
    } = useQuery({
        queryKey: ['api', '/api/orgs/:org/apps', org],
        queryFn: async () => {
            const response = await fetch(`/api/orgs/${org}/apps`, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                throw new Error(`API request failed (${response.status})`);
            }

            return (await response.json()) as AppSummary[];
        },
        enabled: org.length > 0,
    });

    const organizationName = organizationData?.organization?.name ?? startCase(org);
    const appCount = appsData?.length ?? 0;

    if (organizationError) {
        return <div>{organizationError.message}</div>;
    }

    if (appsError) {
        return <div>{appsError.message}</div>;
    }

    if (organizationLoading || appsLoading) {
        return <div>Loading...</div>;
    }

    if (!organizationData) {
        return (
            <div className="flex min-h-screen items-center justify-center px-6 py-12 text-white">
                <Card className="w-full max-w-lg border-white/10 bg-white/[0.04]">
                    <CardContent className="space-y-5 p-8 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white/80">
                            <CircleAlert className="h-6 w-6" />
                        </div>
                        <div className="space-y-2">
                            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Organization not found</p>
                            <h1 className="text-2xl font-semibold">We can&apos;t find {org}</h1>
                            <p className="text-sm text-white/60">
                                The organization you requested does not exist or you do not have access to it.
                            </p>
                        </div>
                        <Link to="/" className={buttonVariants()}>
                            Back to home
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen text-white">
            <header className="border-b border-white/10">
                <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
                    <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-white/80">
                        <Blocks className="h-4 w-4" />
                        LongLink
                    </Link>
                    <UserProfile />
                </div>
            </header>

            <main className="mx-auto w-full max-w-6xl px-6 py-10">
                <section className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-3">
                        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Organization</p>
                        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{organizationName}</h1>
                        <p className="max-w-2xl text-sm leading-6 text-white/60 sm:text-base">
                            Open the apps registered to this workspace or jump into a specific runtime page.
                        </p>
                    </div>

                    <Card className="border-white/10 bg-white/[0.04] lg:min-w-56">
                        <CardContent className="flex items-center justify-between gap-4 p-5">
                            <div>
                                <p className="text-xs uppercase tracking-[0.25em] text-white/45">Apps</p>
                                <p className="mt-2 text-3xl font-semibold">{appCount}</p>
                            </div>
                            <FolderOpen className="h-8 w-8 text-white/30" />
                        </CardContent>
                    </Card>
                </section>

                {appsData?.length ? (
                    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {appsData.map((app) => (
                            <Card key={app.name} className="border-white/10 bg-white/[0.04]">
                                <CardHeader className="space-y-2">
                                    <CardTitle className="text-xl">{startCase(app.name)}</CardTitle>
                                    <p className="text-sm text-white/55">{app.url}</p>
                                </CardHeader>
                                <CardContent>
                                    <Link
                                        to={`/${org}/${app.name}`}
                                        className={buttonVariants({ variant: 'outline', size: 'sm' })}
                                    >
                                        Open app
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </CardContent>
                            </Card>
                        ))}
                    </section>
                ) : (
                    <Card className="border-white/10 bg-white/[0.04]">
                        <CardContent className="space-y-4 p-8">
                            <div className="space-y-2">
                                <h2 className="text-2xl font-semibold">No apps yet</h2>
                                <p className="max-w-2xl text-sm leading-6 text-white/60">
                                    This organization does not have any registered apps. Add one to make it available in
                                    the runtime.
                                </p>
                            </div>
                            <a
                                href="https://docs.longlink.dev"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={buttonVariants({ variant: 'outline' })}
                            >
                                Read the docs
                            </a>
                        </CardContent>
                    </Card>
                )}
            </main>
        </div>
    );
}
