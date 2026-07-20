import { useParams } from 'react-router';
import { Icon } from '@astryxdesign/core/Icon';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Center } from '@astryxdesign/core/Center';
import { Heading } from '@astryxdesign/core/Heading';
import { Section } from '@astryxdesign/core/Section';
import Layout from '@/layout/Layout';
import { useTranslation } from '@/lib/i18n';
import { useOrganization } from '@/hooks/use-organization';
import NotFound from './NotFound';
import Applications from './org/Applications';
import OrganizationSettings, { type SettingsRouteSection } from './org/Settings';

type OrganizationProps = {
    settingsSection?: SettingsRouteSection;
};

/** Renders the organization page shell and tab-specific hero content. */
export default function Organization({ settingsSection }: OrganizationProps) {
    const { t } = useTranslation();
    const { organization = '', settingsApplication = '' } = useParams();
    const section = settingsSection === undefined ? 'applications' : 'settings';
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
            <Section variant="muted" width="100%">
                <Stack direction="horizontal" gap={3} vAlign="center">
                    <Icon icon="viewColumns" size="lg" color="secondary" />
                    <Stack gap={1}>
                        <Heading level={1}>{t('organization.applicationsTitle')}</Heading>
                        <Text as="p" color="secondary">
                            {t('organization.applicationsDescription')}
                        </Text>
                    </Stack>
                </Stack>
            </Section>
        ) : section === 'settings' ? (
            <Section variant="muted" width="100%">
                <Stack direction="horizontal" gap={3} vAlign="center">
                    <Icon icon="wrench" size="lg" color="secondary" />
                    <Stack gap={1}>
                        <Heading level={1}>{t('organization.settingsTitle')}</Heading>
                        <Text as="p" color="secondary">
                            {t('organization.settingsDescription')}
                        </Text>
                    </Stack>
                </Stack>
            </Section>
        ) : null;

    return (
        <Layout
            tabs={{
                [t('navigation.applications')]: { href: `/orgs/${organization}`, icon: 'viewColumns' },
                [t('navigation.settings')]: { href: `/orgs/${organization}/settings`, icon: 'wrench' },
            }}
        >
            <Center axis="horizontal" width="100%">
                <Stack gap={8} maxWidth={1000} width="100%">
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
                            routeSection={settingsSection ?? 'organization'}
                            isLoading={isLoading}
                            error={error}
                        />
                    ) : null}
                </Stack>
            </Center>
        </Layout>
    );
}
