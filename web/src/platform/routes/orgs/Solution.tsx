import { useParams } from 'react-router';
import { Card } from '@astryxdesign/core/Card';
import { ProfileMenu } from '@/components/Profile';
import Platform from '@/platform/layouts/Platform';
import { Center } from '@astryxdesign/core/Center';
import { SolutionRuntime } from '@/components/Solution';
import NotFoundLayout from '@/components/layouts/NotFound';
import { PageContainer } from '@/components/PageContainer';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { PageError, PageLoading } from '@/components/Utils';
import { useAuthenticatedUser } from '@/lib/hooks/use-user';
import { PageBreadcrumb } from '@/components/breadcrumb/Page';
import { useOrganizationSolutions } from '@/lib/hooks/use-organization';

/** Renders one proxy-backed organization solution after route authentication. */
export default function OrganizationSolution() {
    const { organization = '', solution = '' } = useParams();
    const user = useAuthenticatedUser();
    const { solutions, isLoading, error } = useOrganizationSolutions(organization);
    const solutionAccess = solutions.find((item) => item.slug === solution);

    if (isLoading) {
        return <PageLoading label="Loading solution" />;
    }

    if (error?.status === 404) {
        return <NotFoundLayout />;
    }

    if (error && !solutionAccess) {
        return <PageError description="We couldn't load this solution." title="Unable to load solution" />;
    }

    if (!solutionAccess) {
        return <NotFoundLayout />;
    }

    const action = <ProfileMenu user={user} />;
    const breadcrumb = <PageBreadcrumb solutionName={solutionAccess.name} />;

    if (solutionAccess.status === 'creating' || solutionAccess.status === 'failed') {
        const isCreating = solutionAccess.status === 'creating';

        return (
            <Platform action={action} breadcrumb={breadcrumb} tabs={[]}>
                <Center minHeight="calc(100vh - 14rem)" width="100%">
                    <Card maxWidth={576} padding={6} width="100%">
                        <EmptyState
                            description={
                                isCreating
                                    ? 'Please try again in a moment.'
                                    : 'Review the failed operation in the Platform administration area.'
                            }
                            headingLevel={1}
                            role="alert"
                            title={isCreating ? 'Solution is being deployed' : 'Solution deployment failed'}
                        />
                    </Card>
                </Center>
            </Platform>
        );
    }

    return (
        <SolutionRuntime
            navigationBaseUrl={`/orgs/${organization}/solutions/${solution}`}
            viewsUrl={`/api/v1/solutions/${solutionAccess.id}/proxy/views.json`}
            requestBaseUrl={`/api/v1/solutions/${solutionAccess.id}/proxy/`}
        >
            {({ content, tabs }) => (
                <Platform action={action} breadcrumb={breadcrumb} tabs={tabs}>
                    <PageContainer minHeight="100%" padding={2}>
                        {content}
                    </PageContainer>
                </Platform>
            )}
        </SolutionRuntime>
    );
}
