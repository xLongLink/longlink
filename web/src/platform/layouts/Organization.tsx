import { ApiError } from '@/lib/api';
import { NoIndex } from '@/components/Seo';
import { useApi } from '@/lib/hooks/use-api';
import { Outlet, useParams } from 'react-router';
import { ProfileMenu } from '@/components/Profile';
import Platform from '@/platform/layouts/Platform';
import { AppWindow, Settings2 } from 'lucide-react';
import { ApiBoundary } from '@/components/ApiBoundary';
import { PageContainer } from '@/components/PageContainer';
import { PageError, PageLoading } from '@/components/Utils';
import { useAuthenticatedUser } from '@/lib/hooks/use-user';
import { PageBreadcrumb } from '@/components/breadcrumb/Page';
import { OrganizationMembershipContext } from '@/lib/hooks/use-organization';
import { zUserOrganizationMembership } from '@/lib/generated/platform-api-v1/zod.gen';

/** Renders the fixed navigation around organization pages. */
export default function OrganizationLayout() {
    return (
        <ApiBoundary
            fallback={<PageLoading label="Loading organization" />}
            fallbackRender={({ error }) =>
                error instanceof ApiError && error.status === 404 ? (
                    <>
                        <NoIndex title="Organization Not Found | LongLink" />
                        <PageError
                            description="This organization doesn't exist or isn't available."
                            title="Organization not found"
                        />
                    </>
                ) : (
                    <PageError description="We couldn't load this organization." title="Unable to load organization" />
                )
            }
        >
            <OrganizationPage />
        </ApiBoundary>
    );
}

/** Resolves membership before mounting organization-dependent pages. */
function OrganizationPage() {
    const { organization = '' } = useParams();
    const user = useAuthenticatedUser();
    const [membership] = useApi(
        `/api/v1/organizations/slug/${encodeURIComponent(organization)}`,
        zUserOrganizationMembership
    );

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
                <OrganizationMembershipContext value={membership}>
                    <ApiBoundary>
                        <Outlet key={organization} />
                    </ApiBoundary>
                </OrganizationMembershipContext>
            </PageContainer>
        </Platform>
    );
}
