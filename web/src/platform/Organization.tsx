import { Heading } from '@astryxdesign/core/Heading';
import { useTranslator } from '@astryxdesign/core/i18n';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { AppWindow, Settings2 } from 'lucide-react';
import { useParams } from 'react-router';
import { PageContainer } from '@/components/PageContainer';
import { useOrganization } from '@/hooks/use-organization';
import PlatformLayout from '@/platform/layout';
import NotFound from './NotFound';
import Applications from './org/Applications';
import OrganizationSettings, { type SettingsRouteSection } from './org/Settings';

/** Renders the organization page shell and tab-specific hero content. */
export default function Organization({ settingsSection }: { settingsSection?: SettingsRouteSection }) {
    const t = useTranslator();
    const { organization = '' } = useParams();
    const {
        organization: organizationDetails,
        members,
        invitations,
        applications,
        role: organizationRole,
        isLoading,
        error,
    } = useOrganization(organization);
    const isSettings = settingsSection !== undefined;

    // Hide missing or inaccessible orgs behind the shared 404 page.
    if (error?.status === 404) {
        return <NotFound />;
    }

    // Keep edge-aware content aligned within the centered page container.
    return (
        <PlatformLayout
            tabs={{
                [t('navigation.applications')]: { href: `/orgs/${organization}`, icon: AppWindow },
                [t('navigation.settings')]: { href: `/orgs/${organization}/settings`, icon: Settings2 },
            }}
        >
            <PageContainer gap={8}>
                <Stack gap={1} width="100%">
                    <Heading level={1}>
                        {isSettings ? t('organization.settingsTitle') : t('organization.applicationsTitle')}
                    </Heading>
                    <Text as="p" color="secondary">
                        {isSettings ? t('organization.settingsDescription') : t('organization.applicationsDescription')}
                    </Text>
                </Stack>
                {isSettings ? (
                    <OrganizationSettings
                        organization={organization}
                        organizationDetails={organizationDetails}
                        applications={applications}
                        members={members}
                        invitations={invitations}
                        organizationRole={organizationRole}
                        routeSection={settingsSection}
                        isLoading={isLoading}
                        error={error}
                    />
                ) : (
                    <Applications
                        organization={organization}
                        applications={applications}
                        isLoading={isLoading}
                        error={error}
                    />
                )}
            </PageContainer>
        </PlatformLayout>
    );
}
