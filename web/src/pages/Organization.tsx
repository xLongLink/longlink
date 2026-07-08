import { Hero, HeroDescription, HeroTitle } from '@/components/ui/hero';
import { useOrganization } from '@/hooks/use-organization';
import { useUserProfile } from '@/hooks/use-user';
import Layout from '@/layout/Layout';
import { useTranslation } from '@/lib/i18n';
import { LayoutGrid, Settings2 } from 'lucide-react';
import { Navigate, useLocation, useParams } from 'react-router';
import NotFound from './NotFound';
import Applications from './org/Applications';
import OrganizationDatabase from './org/Database';
import OrganizationSettings from './org/Settings';
import OrganizationStorage from './org/Storage';

type OrganizationSection = 'applications' | 'database' | 'settings' | 'storage';

/** Renders the organization page shell and tab-specific hero content. */
export default function Organization({ sectionName }: { sectionName?: OrganizationSection }) {
    const { t } = useTranslation();
    const { organization: routeOrganization = '' } = useParams();
    const { pathname } = useLocation();
    const { organizations } = useUserProfile();
    const organization = routeOrganization || organizations[0]?.slug || '';
    const pathSection = pathname.split('/')[3] ?? '';
    const pathSectionIsOrganizationSection =
        pathSection === 'database' || pathSection === 'storage' || pathSection === 'settings';

    // Direct organization routes infer the active section from the path when one was not passed explicitly.
    const section =
        sectionName ?? (pathSectionIsOrganizationSection ? (pathSection as OrganizationSection) : 'applications');
    const {
        organization: organizationDetails,
        people,
        invitations,
        applications,
        isLoading,
        error,
    } = useOrganization(organization);

    if (organizationDetails && routeOrganization && organizationDetails.slug !== routeOrganization) {
        return (
            <Navigate
                replace
                to={`/orgs/${organizationDetails.slug}${pathname.slice(`/orgs/${routeOrganization}`.length)}`}
            />
        );
    }

    // Hide missing or inaccessible orgs behind the shared 404 page.
    if (error?.status === 404) {
        return <NotFound />;
    }

    let content =
        section === 'database' || section === 'storage' ? null : (
            <Hero icon="layout-grid" className="w-full">
                <div className="flex w-full items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                        <HeroTitle>{t('organization.applicationsTitle')}</HeroTitle>
                        <HeroDescription>{t('organization.applicationsDescription')}</HeroDescription>
                    </div>
                </div>
            </Hero>
        );

    // Swap the hero based on the active path segment.
    if (section === 'settings') {
        content = (
            <Hero icon="settings-2" className="w-full">
                <div className="flex w-full items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                        <HeroTitle>{t('organization.settingsTitle')}</HeroTitle>
                        <HeroDescription>{t('organization.settingsDescription')}</HeroDescription>
                    </div>
                </div>
            </Hero>
        );
    }

    return (
        <Layout
            tabs={{
                [t('navigation.applications')]: { href: `/orgs/${organization}`, icon: LayoutGrid },
                [t('navigation.settings')]: { href: `/orgs/${organization}/settings`, icon: Settings2 },
            }}
        >
            <section className="mx-auto w-full max-w-[1000px] space-y-8">
                {content}
                {section === 'applications' ? (
                    <Applications
                        organization={organization}
                        applications={applications}
                        isLoading={isLoading}
                        error={error}
                    />
                ) : null}
                {section === 'database' ? (
                    <OrganizationDatabase
                        organization={organization}
                        organizationDetails={organizationDetails}
                        isLoading={isLoading}
                    />
                ) : null}
                {section === 'storage' ? (
                    <OrganizationStorage
                        organization={organization}
                        organizationDetails={organizationDetails}
                        isLoading={isLoading}
                    />
                ) : null}
                {section === 'settings' ? (
                    <OrganizationSettings
                        organization={organization}
                        organizationDetails={organizationDetails}
                        applications={applications}
                        people={people}
                        invitations={invitations}
                        isLoading={isLoading}
                        error={error}
                    />
                ) : null}
            </section>
        </Layout>
    );
}
