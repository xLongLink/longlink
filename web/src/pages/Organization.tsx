import Layout from '@/layout/Layout';
import { useOrg } from '@/hooks/use-org';
import { useUser } from '@/hooks/use-user';
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
    const { orgs } = useUser();
    const org = routeOrg || orgs[0]?.name || '';
    const pathSection = pathname.split('/')[3] ?? '';
    const section =
        sectionName ?? (pathSection === 'people' || pathSection === 'settings' ? pathSection : 'applications');
    const { org: orgDetails, people, invitations, apps, isLoading, error } = useOrg(org);

    // Hide missing or inaccessible orgs behind the shared 404 page.
    if (error?.status === 404) {
        return <NotFound />;
    }

    let content = (
        <Hero icon={<LayoutGrid />}>
            <div>
                <HeroTitle>Applications</HeroTitle>
                <HeroDescription>Manage the apps attached to this organization.</HeroDescription>
            </div>
        </Hero>
    );

    // Swap the hero based on the active path segment.
    if (section === 'people') {
        content = (
            <Hero icon={<Users />}>
                <div>
                    <HeroTitle>People</HeroTitle>
                    <HeroDescription>See the members and collaborators in this workspace.</HeroDescription>
                </div>
            </Hero>
        );
    } else if (section === 'settings') {
        content = (
            <Hero icon={<Settings2 />}>
                <div>
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
                    <Applications org={org} apps={apps} isLoading={isLoading} error={error} />
                ) : null}
                {section === 'settings' ? (
                    <OrgSettings org={org} orgDetails={orgDetails} apps={apps} isLoading={isLoading} error={error} />
                ) : null}
            </section>
        </Layout>
    );
}
