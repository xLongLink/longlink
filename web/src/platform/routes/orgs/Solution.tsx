import { useParams } from 'react-router';
import { NoIndex } from '@/components/Seo';
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
import { useOrganizationRoute } from '@/lib/hooks/use-organization';

/** Renders one proxy-backed organization solution after route authentication. */
export default function OrganizationSolution() {
    const { organization = '', solution = '' } = useParams();
    const user = useAuthenticatedUser();
    const { solutions, isLoading, error } = useOrganizationRoute(organization);

    const solutionAccess = solutions.find((item) => item.slug === solution);

    if (isLoading) {
        return (
            <>
                <NoIndex title="Solution | LongLink" />
                <PageLoading label="Loading solution" />
            </>
        );
    }

    if (error?.status === 404) {
        return <NotFoundLayout />;
    }

    if (error && !solutionAccess) {
        return (
            <>
                <NoIndex title="Solution | LongLink" />
                <PageError description="We couldn't load this solution." title="Unable to load solution" />
            </>
        );
    }

    if (!solutionAccess) {
        return <NotFoundLayout />;
    }

    const action = <ProfileMenu user={user} />;
    const breadcrumb = <PageBreadcrumb solutionName={solutionAccess.name} />;

    const deploymentNotice =
        solutionAccess.status === 'creating'
            ? {
                  description: 'Please try again in a moment.',
                  title: 'Solution is being deployed',
              }
            : solutionAccess.status === 'failed'
              ? {
                    description: 'Review the failed operation in the Platform administration area.',
                    title: 'Solution deployment failed',
                }
              : null;

    // Show one standalone notice for unavailable solution deployments.
    if (deploymentNotice) {
        return (
            <Platform action={action} breadcrumb={breadcrumb} tabs={[]}>
                <NoIndex title={`${solutionAccess.name} | LongLink`} />
                <Center minHeight="calc(100vh - 14rem)" width="100%">
                    <EmptyState
                        description={deploymentNotice.description}
                        headingLevel={1}
                        role="alert"
                        title={deploymentNotice.title}
                    />
                </Center>
            </Platform>
        );
    }

    return (
        <SolutionRuntime
            navigationBaseUrl={`/orgs/${organization}/solutions/${solution}`}
            viewsUrl={`/api/v1/solutions/${solutionAccess.id}/proxy/views.json`}
        >
            {({ content, tabs, title }) => (
                <Platform action={action} breadcrumb={breadcrumb} tabs={tabs}>
                    <NoIndex title={`${title ?? solutionAccess.name} | LongLink`} />
                    <PageContainer minHeight="100%" padding={2}>
                        {content}
                    </PageContainer>
                </Platform>
            )}
        </SolutionRuntime>
    );
}
