import { ApiError } from '@/lib/api';
import { useApi } from '@/lib/hooks/use-api';
import { ApiBoundary } from '@/components/api';
import { Outlet, useParams } from 'react-router';
import NotFoundLayout from '@/components/layouts/not-found';
import { PageError, PageLoading } from '@/components/ui/utils';
import { OrganizationFrame } from '@/platform/layouts/organization';
import { zUserOrganizationMembership } from '@/lib/generated/platform-api-v1/zod.gen';

/** Resolves organization access before either organization or Solution pages mount. */
export default function OrganizationAccess() {
    const { organization = '', solution } = useParams();
    const solutionRoute = solution !== undefined;
    const resource = solutionRoute ? 'solution' : 'organization';

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
                    <OrganizationFrame organization={{ id: organization }} showSwitcher>
                        <PageLoading label="Loading organization" />
                    </OrganizationFrame>
                )
            }
            fallbackRender={({ error }) => {
                const content =
                    error instanceof ApiError && error.status === 404 ? (
                        <NotFoundLayout />
                    ) : (
                        <>
                            {solutionRoute && <title>Solution | LongLink</title>}
                            <PageError
                                description={`We couldn't load this ${resource}.`}
                                title={`Unable to load ${resource}`}
                            />
                        </>
                    );

                return solutionRoute ? (
                    content
                ) : (
                    <OrganizationFrame organization={{ id: organization }} showSwitcher={false}>
                        {content}
                    </OrganizationFrame>
                );
            }}
        >
            <OrganizationMembership organization={organization} />
        </ApiBoundary>
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
