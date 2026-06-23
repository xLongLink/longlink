import { useOrg } from '@/hooks/use-org';
import { useUser } from '@/hooks/use-user';
import Layout from '@/layout/Layout';
import { Avatar, AvatarFallback, AvatarImage } from '@ui/avatar';
import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { LayoutGrid, Settings2, Users } from 'lucide-react';
import { useLocation, useParams } from 'react-router';
import NotFound from './NotFound';
import Applications from './org/Applications';
import People from './org/People';
import OrgSettings from './org/Settings';

type OrganizationSection = 'applications' | 'people' | 'settings';

type OrganizationProps = {
    sectionName?: OrganizationSection;
};

/** Renders the organization page shell and tab-specific hero content. */
export default function Organization({ sectionName }: OrganizationProps) {
    const { org: routeOrg = '' } = useParams();
    const { pathname } = useLocation();
    const { organizations } = useUser();
    const org = routeOrg || organizations[0]?.name || '';
    const pathSection = pathname.split('/')[3] ?? '';
    const section =
        sectionName ?? (pathSection === 'people' || pathSection === 'settings' ? pathSection : 'applications');
    const { org: orgDetails, people, invitations, applications, isLoading, error } = useOrg(org);
    const orgName = orgDetails?.name ?? org;
    const orgAvatar = orgDetails?.avatar ?? '';

    const orgHeader = (
        <div className="flex items-center gap-4">
            <Avatar className="size-12">
                <AvatarImage src={orgAvatar} alt={orgName} />
                <AvatarFallback>{orgName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Organization</div>
                <div className="text-lg font-semibold text-foreground">{orgName}</div>
            </div>
        </div>
    );

    // Hide missing or inaccessible orgs behind the shared 404 page.
    if (error?.status === 404) {
        return <NotFound />;
    }

    let content = (
        <Hero icon={<LayoutGrid />}>
            <div className="space-y-3">
                {orgHeader}
                <HeroTitle>Applications</HeroTitle>
                <HeroDescription>Manage the applications attached to this organization.</HeroDescription>
            </div>
        </Hero>
    );

    // Swap the hero based on the active path segment.
    if (section === 'people') {
        content = (
            <Hero icon={<Users />}>
                <div className="space-y-3">
                    {orgHeader}
                    <HeroTitle>People</HeroTitle>
                    <HeroDescription>See the members and collaborators in this workspace.</HeroDescription>
                </div>
            </Hero>
        );
    } else if (section === 'settings') {
        content = (
            <Hero icon={<Settings2 />}>
                <div className="space-y-3">
                    {orgHeader}
                    <HeroTitle>Settings</HeroTitle>
                    <HeroDescription>Configure the organization and its runtime defaults.</HeroDescription>
                </div>
            </Hero>
        );
    }

    return (
        <Layout
            tabs={{
                Applications: { href: `/orgs/${org}`, icon: LayoutGrid },
                People: { href: `/orgs/${org}/people`, icon: Users },
                Settings: { href: `/orgs/${org}/settings`, icon: Settings2 },
            }}
        >
            <section className="mx-auto w-full max-w-[1000px] space-y-8">
                {content}

                {section === 'people' ? (
                    <People org={org} people={people} invitations={invitations} isLoading={isLoading} error={error} />
                ) : null}
                {section === 'applications' ? (
                    <Applications org={org} applications={applications} isLoading={isLoading} error={error} />
                ) : null}
                {section === 'settings' ? (
                    <OrgSettings
                        org={org}
                        orgDetails={orgDetails}
                        applications={applications}
                        isLoading={isLoading}
                        error={error}
                    />
                ) : null}
            </section>
        </Layout>
    );
}
