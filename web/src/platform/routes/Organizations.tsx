import { useSearchParams } from 'react-router';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Banner } from '@astryxdesign/core/Banner';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Building2, Settings2 } from 'lucide-react';
import { Heading } from '@astryxdesign/core/Heading';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Table, type TableColumn, proportional } from '@astryxdesign/core/Table';
import type { UserOrganizationMembership } from '@/lib/generated/platform-api-v1/types.gen';
import PlatformLayout from '@/platform/layout';
import { useUserProfile } from '@/hooks/use-user';
import { SignInCard } from '@/components/SignInCard';
import { PageContainer } from '@/components/PageContainer';
import CreateOrganization from '@/components/dialogs/CreateOrganization';

/** Renders the organizations landing page for signed-in and anonymous users. */
export default function Organizations() {
    const {
        user,
        memberships,
        isLoading: isProfileLoading,
        isOrganizationsLoading,
        error: profileError,
        organizationsError,
    } = useUserProfile();
    const [searchParams] = useSearchParams();
    const organizationState =
        memberships.length === 0 && (isProfileLoading || isOrganizationsLoading)
            ? 'loading'
            : memberships.length === 0 && (profileError || organizationsError)
              ? 'error'
              : 'content';

    // Show sign-in prompt for anonymous visitors.
    if (!user) {
        return (
            <PlatformLayout brandOnly brandHref="/" fillViewport>
                <VStack height="100%" justify="center" align="center" width="100%">
                    <SignInCard initialEmail={searchParams.get('email') ?? ''} />
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
            tabs={[
                { href: '/organizations', icon: Building2, label: 'Organizations' },
                { href: '/settings', icon: Settings2, label: 'Settings' },
            ]}
        >
            <PageContainer gap={8}>
                <HStack gap={4} justify="between" align="end" wrap="wrap">
                    <VStack gap={1}>
                        <Heading level={1}>Organizations</Heading>
                        <Text type="supporting">Manage the workspaces connected to your LongLink account.</Text>
                    </VStack>
                    <CreateOrganization />
                </HStack>
                {organizationState === 'loading' ? null : organizationState === 'error' ? (
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
