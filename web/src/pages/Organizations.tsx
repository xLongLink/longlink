import { useLocation } from 'react-router';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Banner } from '@astryxdesign/core/Banner';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Building2, Settings2 } from 'lucide-react';
import { Heading } from '@astryxdesign/core/Heading';
import { useTranslator } from '@astryxdesign/core/i18n';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Table, type TableColumn, proportional } from '@astryxdesign/core/Table';
import type { ApiUserOrganizationMembership } from '@/lib/types';
import Layout from '@/layout/Layout';
import { SignInCard } from '@/components/SignInCard';
import { sanitizeRedirectPath } from '@/lib/redirects';
import { PageContainer } from '@/components/PageContainer';
import { useUserOrganizations, useUserProfile } from '@/hooks/use-user';
import CreateOrganization from '@/components/dialogs/CreateOrganization';

/** Renders the organizations landing page for signed-in and anonymous users. */
export default function Organizations() {
    const t = useTranslator();
    const { user, isLoading: isProfileLoading, error: profileError } = useUserProfile();
    const { organizations, isLoading: areOrganizationsLoading, error: organizationsError } = useUserOrganizations();
    const location = useLocation();
    const search = new URLSearchParams(location.search);
    const nextPath = search.get('next');
    const redirectTo = sanitizeRedirectPath(nextPath);
    const initialEmail = search.get('email') ?? '';
    const isLoading = isProfileLoading || areOrganizationsLoading;
    const error = profileError ?? organizationsError;

    // Show sign-in prompt for anonymous visitors.
    if (!user) {
        return (
            <Layout brandOnly brandHref="/" fillViewport reserveTabSpace>
                <VStack height="100%" justify="center" align="center" width="100%">
                    <SignInCard redirectTo={redirectTo} initialEmail={initialEmail} />
                </VStack>
            </Layout>
        );
    }

    const columns: TableColumn<ApiUserOrganizationMembership>[] = [
        {
            key: 'name',
            header: t('columns.name'),
            width: proportional(1),
            renderCell: (organization) => (
                <HStack gap={3} align="center">
                    <Avatar src={organization.avatar ?? undefined} name={organization.name} size="small" />
                    <VStack gap={1}>
                        <Link href={`/orgs/${organization.slug}`} weight="semibold">
                            {organization.name}
                        </Link>
                        <Text type="supporting">{organization.country}</Text>
                    </VStack>
                </HStack>
            ),
        },
    ];
    const tableError = error ? new Error(t('errors.loadOrganizations')) : null;

    return (
        <Layout
            brandOnly
            brandHref="/"
            tabs={{
                [t('navigation.organizations')]: { href: '/organizations', icon: Building2 },
                [t('navigation.settings')]: { href: '/settings', icon: Settings2 },
            }}
        >
            <PageContainer gap={8}>
                <HStack gap={4} justify="between" align="end" wrap="wrap">
                    <VStack gap={1}>
                        <Heading level={1}>{t('organizations.title')}</Heading>
                        <Text type="supporting">{t('organizations.description')}</Text>
                    </VStack>
                    <CreateOrganization />
                </HStack>
                {isLoading && organizations.length === 0 ? null : tableError && organizations.length === 0 ? (
                    <Banner status="error" title={tableError.message} />
                ) : (
                    <Table
                        columns={columns}
                        data={organizations}
                        density="compact"
                        emptyState={<EmptyState title={t('common.noResults')} isCompact />}
                        hasHover
                        idKey="id"
                    />
                )}
            </PageContainer>
        </Layout>
    );
}
