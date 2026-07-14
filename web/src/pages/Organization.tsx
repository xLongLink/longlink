import { Hero, HeroDescription, HeroTitle } from '@/components/ui/hero';
import { useOrganization } from '@/hooks/use-organization';
import Layout from '@/layout/Layout';
import { useTranslation } from '@/lib/i18n';
import { Database, HardDrive, LayoutGrid, Settings2 } from 'lucide-react';
import { useParams } from 'react-router';
import NotFound from './NotFound';
import Applications from './org/Applications';
import OrganizationDatabase from './org/Database';
import OrganizationSettings, { type SettingsRouteSection } from './org/Settings';
import OrganizationStorage from './org/Storage';

type OrganizationSection = 'applications' | 'database' | 'settings' | 'storage';

type OrganizationProps = {
    sectionName?: OrganizationSection;
    settingsSection?: SettingsRouteSection;
};

/** Renders the organization page shell and tab-specific hero content. */
export default function Organization({ sectionName, settingsSection = 'organization' }: OrganizationProps) {
    const { t } = useTranslation();
    const { organization = '', settingsApplication = '' } = useParams();
    const section = sectionName ?? 'applications';
    const {
        organization: organizationDetails,
        people,
        invitations,
        applications,
        isLoading,
        error,
    } = useOrganization(organization);

    // Hide missing or inaccessible orgs behind the shared 404 page.
    if (error?.status === 404) {
        return <NotFound />;
    }

    // Reject unknown application settings routes after organization data resolves.
    if (
        !isLoading &&
        error === null &&
        settingsApplication.length > 0 &&
        !applications.some((application) => application.slug === settingsApplication)
    ) {
        return <NotFound />;
    }

    const content =
        section === 'applications' ? (
            <Hero icon="layout-grid" className="w-full">
                <div className="flex w-full items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                        <HeroTitle>{t('organization.applicationsTitle')}</HeroTitle>
                        <HeroDescription>{t('organization.applicationsDescription')}</HeroDescription>
                    </div>
                </div>
            </Hero>
        ) : section === 'settings' ? (
            <Hero icon="settings-2" className="w-full">
                <div className="flex w-full items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                        <HeroTitle>{t('organization.settingsTitle')}</HeroTitle>
                        <HeroDescription>{t('organization.settingsDescription')}</HeroDescription>
                    </div>
                </div>
            </Hero>
        ) : null;

    return (
        <Layout
            tabs={{
                [t('navigation.applications')]: { href: `/orgs/${organization}`, icon: LayoutGrid },
                [t('navigation.database')]: { href: `/orgs/${organization}/database`, icon: Database },
                [t('navigation.storage')]: { href: `/orgs/${organization}/storage`, icon: HardDrive },
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
                        routeSection={settingsSection}
                        isLoading={isLoading}
                        error={error}
                    />
                ) : null}
            </section>
        </Layout>
    );
}
