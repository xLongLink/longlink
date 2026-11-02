import { ApiError } from '@/lib/api';
import { useApi } from '@/lib/hooks/use-api';
import { ProfileMenu } from '@/components/Profile';
import Platform from '@/components/layouts/Platform';
import { ApiBoundary } from '@/components/ApiBoundary';
import NotFoundLayout from '@/components/layouts/NotFound';
import { PageContainer } from '@/components/PageContainer';
import { Outlet, useMatch, useParams } from 'react-router';
import { PageError, PageLoading } from '@/components/Utils';
import { OrganizationSwitcher } from '@/platform/components/OrganizationSwitcher';
import { zUserOrganizationMembership } from '@/lib/generated/platform-api-v1/zod.gen';
import { OrganizationBreadcrumb } from '@/platform/components/OrganizationBreadcrumb';

/** Resolves organization access before either organization or Solution pages mount. */
export default function OrganizationAccess() {
    const { organization = '' } = useParams();
    const solutionRoute = useMatch('/orgs/:organization/solutions/:solution/*');

    return (
        <ApiBoundary
            key={organization}
            fallback={
                solutionRoute ? (
                    <>
                        <title>Solution | LongLink</title>
                        <PageLoading label="Loading solution" />
                    </>
                ) : (
                    <Platform
                        action={<ProfileMenu />}
                        breadcrumb={<OrganizationBreadcrumb organization={{ id: organization }} />}
                        sidebarHeader={<OrganizationSwitcher organization={{ id: organization }} />}
                        isNavigationLoading
                        tabs={[]}
                    >
                        <PageContainer gap={8} padding={2}>
                            <PageLoading label="Loading organization" />
                        </PageContainer>
                    </Platform>
                )
            }
            fallbackRender={({ error }) =>
                solutionRoute ? (
                    error instanceof ApiError && error.status === 404 ? (
                        <NotFoundLayout />
                    ) : (
                        <>
                            <title>Solution | LongLink</title>
                            <PageError description="We couldn't load this solution." title="Unable to load solution" />
                        </>
                    )
                ) : (
                    <Platform
                        action={<ProfileMenu />}
                        breadcrumb={<OrganizationBreadcrumb organization={{ id: organization }} />}
                        tabs={[]}
                    >
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
                )
            }
        >
            <OrganizationMembership />
        </ApiBoundary>
    );
}

/** Supplies the resolved membership to the active route branch. */
function OrganizationMembership() {
    const { organization = '' } = useParams();

    const [membership] = useApi(
        `/api/v1/organizations/${encodeURIComponent(organization)}`,
        zUserOrganizationMembership
    );

    return <Outlet context={membership} />;
}
