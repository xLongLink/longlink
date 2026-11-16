import { ApiError } from '@/lib/api';
import type { ReactNode } from 'react';
import { useApi } from '@/lib/hooks/use-api';
import { ApiBoundary } from '@/components/api';
import Platform from '@/components/layouts/platform';
import { ProfileMenu } from '@/components/ui/profile';
import { Outlet, useMatch, useParams } from 'react-router';
import NotFoundLayout from '@/components/layouts/not-found';
import { PageContainer } from '@/components/ui/page-container';
import { PageError, PageLoading } from '@/components/ui/utils';
import { OrganizationSwitcher } from '@/components/ui/organization-switcher';
import { OrganizationBreadcrumb } from '@/components/ui/organization-breadcrumb';
import { zUserOrganizationMembership } from '@/lib/generated/platform-api-v1/zod.gen';

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
                    <OrganizationFallback
                        organization={organization}
                        sidebarHeader={<OrganizationSwitcher organization={{ id: organization }} />}
                    >
                        <PageLoading label="Loading organization" />
                    </OrganizationFallback>
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
                    <OrganizationFallback organization={organization}>
                        {error instanceof ApiError && error.status === 404 ? (
                            <NotFoundLayout />
                        ) : (
                            <PageError
                                description="We couldn't load this organization."
                                title="Unable to load organization"
                            />
                        )}
                    </OrganizationFallback>
                )
            }
        >
            <OrganizationMembership organization={organization} />
        </ApiBoundary>
    );
}

/** Keeps organization loading and error states within the same application chrome. */
function OrganizationFallback({
    organization,
    sidebarHeader,
    children
}: {
    organization: string;
    sidebarHeader?: ReactNode;
    children: ReactNode;
}) {
    return (
        <Platform
            action={<ProfileMenu />}
            breadcrumb={<OrganizationBreadcrumb organization={{ id: organization }} />}
            sidebarHeader={sidebarHeader}
            tabs={[]}
        >
            <PageContainer gap={8} padding={2}>
                {children}
            </PageContainer>
        </Platform>
    );
}

/** Supplies the resolved membership to the active route branch. */
function OrganizationMembership({ organization }: { organization: string }) {
    const [membership] = useApi(
        `/api/v1/organizations/${encodeURIComponent(organization)}`,
        zUserOrganizationMembership
    );

    return <Outlet context={membership} />;
}
