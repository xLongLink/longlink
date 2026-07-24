import { useParams } from 'react-router';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { AppWindow, Settings2 } from 'lucide-react';
import { Heading } from '@astryxdesign/core/Heading';
import { useTranslator } from '@astryxdesign/core/i18n';
import Layout from '@/layout/Layout';
import { PageContainer } from '@/components/PageContainer';
import { useOrganization } from '@/hooks/use-organization';
import NotFound from './NotFound';
import Applications from './org/Applications';
import OrganizationSettings, { type SettingsRouteSection } from './org/Settings';

type OrganizationProps = {
    settingsSection?: SettingsRouteSection;
};

/** Renders the organization page shell and tab-specific hero content. */
export default function Organization({ settingsSection }: OrganizationProps) {
    const t = useTranslator();
    const { organization = '', settingsApplication = '' } = useParams();
    const section = settingsSection === undefined ? 'applications' : 'settings';
    const {
        organization: organizationDetails,
        people,
        invitations,
        applications,
        role: organizationRole,
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

    const content = (
        <Stack gap={1} width="100%">
            <Heading level={1}>
                {section === 'applications' ? t('organization.applicationsTitle') : t('organization.settingsTitle')}
            </Heading>
            <Text as="p" color="secondary">
                {section === 'applications'
                    ? t('organization.applicationsDescription')
                    : t('organization.settingsDescription')}
            </Text>
        </Stack>
    );

    // Keep edge-aware content aligned within the centered page container.
    return (
        <Layout
            tabs={{
                [t('navigation.applications')]: { href: `/orgs/${organization}`, icon: AppWindow },
                [t('navigation.settings')]: { href: `/orgs/${organization}/settings`, icon: Settings2 },
            }}
        >
            <PageContainer gap={8}>
                {content}
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
                        people={people}
                        invitations={invitations}
                        organizationRole={organizationRole}
                        routeSection={settingsSection ?? 'organization'}
                        isLoading={isLoading}
                        error={error}
                    />
                ) : null}
            </PageContainer>
        </Layout>
    );
}
