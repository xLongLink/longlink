import { useParams } from 'react-router';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { AppWindow, Settings2 } from 'lucide-react';
import { Heading } from '@astryxdesign/core/Heading';
import NotFound from '@/platform/NotFound';
import PlatformLayout from '@/platform/layout';
import { PageContainer } from '@/components/PageContainer';
import { useOrganization } from '@/hooks/use-organization';
import OrganizationSettings from '@/components/settings/Settings';

/** Renders the organization settings page. */
export default function OrganizationSettingsRoute() {
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

    // Hide missing or inaccessible orgs behind the shared 404 page.
    if (error?.status === 404) {
        return <NotFound />;
    }

    return (
        <PlatformLayout
            tabs={[
                { href: `/orgs/${organization}`, icon: AppWindow, label: 'Applications' },
                { href: `/orgs/${organization}/settings`, icon: Settings2, label: 'Settings' },
            ]}
        >
            <PageContainer gap={8}>
                <Stack gap={1} width="100%">
                    <Heading level={1}>Settings</Heading>
                    <Text as="p" color="secondary">
                        Configure the organization and its runtime defaults.
                    </Text>
                </Stack>
                <OrganizationSettings
                    organization={organization}
                    organizationDetails={organizationDetails}
                    applications={applications}
                    members={members}
                    invitations={invitations}
                    organizationRole={organizationRole}
                    routeSection="organization"
                    isLoading={isLoading}
                    error={error}
                />
            </PageContainer>
        </PlatformLayout>
    );
}
