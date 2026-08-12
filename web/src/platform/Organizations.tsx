import { Avatar } from '@astryxdesign/core/Avatar';
import { Banner } from '@astryxdesign/core/Banner';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { Link } from '@astryxdesign/core/Link';
import { Table, type TableColumn, proportional } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { Building2, Settings2 } from 'lucide-react';
import { useLocation } from 'react-router';
import CreateOrganization from '@/components/dialogs/CreateOrganization';
import { PageContainer } from '@/components/PageContainer';
import { SignInCard } from '@/components/SignInCard';
import { useUserOrganizations, useUserProfile } from '@/hooks/use-user';
import type { UserOrganizationMembership } from '@/lib/generated/platform-api-v1/types.gen';
import PlatformLayout from '@/platform/layout';

/** Renders the organizations landing page for signed-in and anonymous users. */
export default function Organizations() {
    const { user, isLoading: isProfileLoading, error: profileError } = useUserProfile();
    const { memberships, isLoading: areOrganizationsLoading, error: organizationsError } = useUserOrganizations();
    const location = useLocation();

    // Show sign-in prompt for anonymous visitors.
    if (!user) {
        return (
            <PlatformLayout brandOnly brandHref="/" fillViewport>
                <VStack height="100%" justify="center" align="center" width="100%">
                    <SignInCard initialEmail={new URLSearchParams(location.search).get('email') ?? ''} />
                </VStack>
            </PlatformLayout>
        );
    }

    const columns: TableColumn<UserOrganizationMembership>[] = [
        {
            key: 'name',
            header: 'Name',
            width: proportional(1),
            renderCell: (membership) => (
                <HStack gap={3} align="center">
                    <Avatar
                        src={membership.organization.avatar || undefined}
                        name={membership.organization.name}
                        size="md"
                    />
                    <Link href={`/orgs/${membership.organization.slug}`} weight="semibold">
                        {membership.organization.name}
                    </Link>
                </HStack>
            ),
        },
    ];
    return (
        <PlatformLayout
            brandOnly
            brandHref="/"
            tabs={{
                Organizations: { href: '/organizations', icon: Building2 },
                Settings: { href: '/settings', icon: Settings2 },
            }}
        >
            <PageContainer gap={8}>
                <HStack gap={4} justify="between" align="end" wrap="wrap">
                    <VStack gap={1}>
                        <Heading level={1}>Organizations</Heading>
                        <Text type="supporting">Manage the workspaces connected to your LongLink account.</Text>
                    </VStack>
                    <CreateOrganization />
                </HStack>
                {(isProfileLoading || areOrganizationsLoading) && memberships.length === 0 ? null : (profileError ??
                      organizationsError) &&
                  memberships.length === 0 ? (
                    <Banner status="error" title="Failed to load organizations." />
                ) : (
                    <Table
                        columns={columns}
                        data={memberships}
                        density="compact"
                        emptyState={<EmptyState title="No results." isCompact />}
                        hasHover
                        idKey={(membership) => membership.organization.id}
                    />
                )}
            </PageContainer>
        </PlatformLayout>
    );
}
