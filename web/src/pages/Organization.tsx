import { useOrganization } from '@/hooks/use-organization';
import { useUser } from '@/hooks/use-user';
import Layout from '@/layout/Layout';
import { Hero, HeroDescription, HeroTitle } from '@ui/hero';
import { LayoutGrid, Settings2, Users } from 'lucide-react';
import { useLocation, useParams } from 'react-router';
import NotFound from './NotFound';
import Applications from './org/Applications';
import People from './org/People';
import OrganizationSettings from './org/Settings';

type OrganizationSection = 'applications' | 'people' | 'settings';

type OrganizationProps = {
    sectionName?: OrganizationSection;
};

/** Renders the organization page shell and tab-specific hero content. */
export default function Organization({ sectionName }: OrganizationProps) {
    const { organization: routeOrganization = '' } = useParams();
    const { pathname } = useLocation();
    const { organizations } = useUser();
    const organization = routeOrganization || organizations[0]?.slug || '';
    const pathSection = pathname.split('/')[3] ?? '';
    const section =
        sectionName ?? (pathSection === 'people' || pathSection === 'settings' ? pathSection : 'applications');
    const { organization: organizationDetails, people, invitations, applications, isLoading, error } = useOrganization(
        organization
    );

    // Hide missing or inaccessible orgs behind the shared 404 page.
    if (error?.status === 404) {
        return <NotFound />;
    }

    let content = (
        <Hero icon={<LayoutGrid />} className="w-full">
            <div className="flex w-full items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <HeroTitle>Applications</HeroTitle>
                    <HeroDescription>Manage the applications attached to this organization.</HeroDescription>
                </div>
            </div>
        </Hero>
    );

    // Swap the hero based on the active path segment.
    if (section === 'people') {
        content = (
            <Hero icon={<Users />} className="w-full">
                <div className="flex w-full items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                        <HeroTitle>People</HeroTitle>
                        <HeroDescription>See the members and collaborators in this workspace.</HeroDescription>
                    </div>
                </div>
            </Hero>
        );
    } else if (section === 'settings') {
        content = (
            <Hero icon={<Settings2 />} className="w-full">
                <div className="flex w-full items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                        <HeroTitle>Settings</HeroTitle>
                        <HeroDescription>Configure the organization and its runtime defaults.</HeroDescription>
                    </div>
                </div>
            </Hero>
        );
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
                {content}

                {section === 'people' ? (
                    <People
                        organization={organization}
                        people={people}
                        invitations={invitations}
                        isLoading={isLoading}
                        error={error}
                    />
                ) : null}
                {section === 'applications' ? (
                    <Applications
                        organization={organization}
                        applications={applications}
                        isLoading={isLoading}
                        error={error}
                    />
                ) : null}
                {section === 'settings' ? (
                    <OrganizationSettings
                        organization={organization}
                        organizationDetails={organizationDetails}
                        applications={applications}
                        isLoading={isLoading}
                        error={error}
                    />
                ) : null}
            </section>
        </Layout>
    );
}
