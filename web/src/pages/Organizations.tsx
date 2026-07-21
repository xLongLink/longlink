import { useLocation } from 'react-router';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Banner } from '@astryxdesign/core/Banner';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Heading } from '@astryxdesign/core/Heading';
import { useTranslator } from '@astryxdesign/core/i18n';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Table, type TableColumn, proportional } from '@astryxdesign/core/Table';
import type { ApiUserOrganizationMembership } from '@/lib/types';
import Layout from '@/layout/Layout';
import { useUserProfile } from '@/hooks/use-user';
import { SignInCard } from '@/components/SignInCard';
import { sanitizeRedirectPath } from '@/lib/redirects';
import CreateOrganization from '@/components/dialogs/CreateOrganization';

/** Renders the organizations landing page for signed-in and anonymous users. */
export default function Organizations() {
    const t = useTranslator();
    const { user, organizations, isLoading, error } = useUserProfile();
    const location = useLocation();
    const nextPath = new URLSearchParams(location.search).get('next');
    const redirectTo = sanitizeRedirectPath(nextPath);

    // Show sign-in prompt for anonymous visitors.
    if (!user) {
        return (
            <Layout brandOnly brandHref="/" fillViewport reserveTabSpace>
                <VStack height="100%" justify="center" align="center" width="100%">
                    <SignInCard redirectTo={redirectTo} />
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
                [t('navigation.organizations')]: '/organizations',
                [t('navigation.settings')]: '/settings',
            }}
        >
            <VStack
                className="[--container-padding-block-end:0px] [--container-padding-block-start:0px] [--container-padding-inline-end:0px] [--container-padding-inline-start:0px]"
                gap={8}
                width="100%"
                maxWidth={1000}
                style={{ marginInline: 'auto' }}
            >
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
            </VStack>
        </Layout>
    );
}
