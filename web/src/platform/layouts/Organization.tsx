import { ApiError } from '@/lib/api';
import { useApi } from '@/lib/hooks/use-api';
import { Outlet, useParams } from 'react-router';
import { AppWindow, Settings2 } from 'lucide-react';
import Platform from '@/components/layouts/Platform';
import { ApiBoundary } from '@/components/ApiBoundary';
import NotFoundLayout from '@/components/layouts/NotFound';
import { PageContainer } from '@/components/PageContainer';
import { PageError, PageLoading } from '@/components/Utils';
import { useAuthenticatedUser } from '@/lib/hooks/use-user';
import { ProfileMenu } from '@/platform/components/Profile';
import { PageBreadcrumb } from '@/platform/components/PageBreadcrumb';
import { zUserOrganizationMembership } from '@/lib/generated/platform-api-v1/zod.gen';

/** Renders the fixed navigation around organization pages. */
export default function OrganizationLayout() {
    const user = useAuthenticatedUser();

    return (
        <ApiBoundary
            fallback={
                <Platform action={<ProfileMenu user={user} />} breadcrumb={<PageBreadcrumb />} tabs={[]}>
                    <PageContainer gap={8} padding={2}>
                        <PageLoading label="Loading organization" />
                    </PageContainer>
                </Platform>
            }
            fallbackRender={({ error }) => (
                <Platform action={<ProfileMenu user={user} />} breadcrumb={<PageBreadcrumb />} tabs={[]}>
                    <PageContainer gap={8} padding={2}>
                        {error instanceof ApiError && error.status === 404 ? (
                            <NotFoundLayout />
                        ) : (
                            <PageError
                                description="We couldn't load this organization."
                                title="Unable to load organization"
                            />
                        )}
                    </PageContainer>
                </Platform>
            )}
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
                <ApiBoundary>
                    <Outlet key={organization} context={membership} />
                </ApiBoundary>
            </PageContainer>
        </Platform>
    );
}
