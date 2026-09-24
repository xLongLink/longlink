import { ApiError } from '@/lib/api';
import { NoIndex } from '@/components/Seo';
import { Outlet, useParams } from 'react-router';
import { ProfileMenu } from '@/components/Profile';
import Platform from '@/platform/layouts/Platform';
import { AppWindow, Settings2 } from 'lucide-react';
import { PageContainer } from '@/components/PageContainer';
import { PageError, PageLoading } from '@/components/Utils';
import { useAuthenticatedUser } from '@/lib/hooks/use-user';
import { PageBreadcrumb } from '@/components/breadcrumb/Page';
import { useOrganizationMembership } from '@/lib/hooks/use-organization';

/** Renders the fixed navigation around organization pages. */
export default function OrganizationLayout() {
    const { organization = '' } = useParams();
    const user = useAuthenticatedUser();
    const membership = useOrganizationMembership(organization);

    // Resolve the organization before mounting XML views that depend on its membership.
    if (membership.isLoading) return <PageLoading label="Loading organization" />;
    if (membership.error instanceof ApiError && membership.error.status === 404) {
        return (
            <>
                <NoIndex title="Organization Not Found | LongLink" />
                <PageError
                    description="This organization doesn't exist or isn't available."
                    title="Organization not found"
                />
            </>
        );
    }
    if (membership.error) {
        return <PageError description="We couldn't load this organization." title="Unable to load organization" />;
    }

    return (
        <Platform
            action={<ProfileMenu user={user} />}
            breadcrumb={<PageBreadcrumb />}
            tabs={[
                { href: `/orgs/${organization}`, icon: AppWindow, label: 'Solutions' },
                { href: `/orgs/${organization}/settings`, icon: Settings2, label: 'Settings' },
            ]}
        >
            <PageContainer gap={8} padding={2}>
                <Outlet key={organization} />
            </PageContainer>
        </Platform>
    );
}
