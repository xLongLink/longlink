import type { z } from 'zod';
import { ApiError } from '@/lib/api';
import { useParams } from 'react-router';
import { useApi } from '@/lib/hooks/use-api';
import { NoIndex } from '@/components/NoIndex';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { ProfileMenu } from '@/components/Profile';
import Platform from '@/platform/layouts/Platform';
import { Center } from '@astryxdesign/core/Center';
import { Heading } from '@astryxdesign/core/Heading';
import { ApiBoundary } from '@/components/ApiBoundary';
import { SolutionRuntime } from '@/components/Solution';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import NotFoundLayout from '@/components/layouts/NotFound';
import { PageContainer } from '@/components/PageContainer';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { PageError, PageLoading } from '@/components/Utils';
import { useAuthenticatedUser } from '@/lib/hooks/use-user';
import { PageBreadcrumb } from '@/components/breadcrumb/Page';
import type {
    zUserOrganizationMembership,
    zOrganizationSolutionSummary,
} from '@/lib/generated/platform-api-v1/zod.gen';

/** Renders one proxy-backed organization solution after route authentication. */
export default function OrganizationSolution() {
    return (
        <ApiBoundary
            fallback={
                <>
                    <NoIndex title="Solution | LongLink" />
                    <PageLoading label="Loading solution" />
                </>
            }
            fallbackRender={({ error }) =>
                error instanceof ApiError && error.status === 404 ? (
                    <NotFoundLayout />
                ) : (
                    <>
                        <NoIndex title="Solution | LongLink" />
                        <PageError description="We couldn't load this solution." title="Unable to load solution" />
                    </>
                )
            }
        >
            <SolutionPage />
        </ApiBoundary>
    );
}

/** Resolves organization access before polling its deployments or loading Solution content. */
function SolutionPage() {
    const { organization = '', solution = '' } = useParams();
    const user = useAuthenticatedUser();

    const [membership] = useApi<z.output<typeof zUserOrganizationMembership>>(
        `/api/v1/organizations/slug/${encodeURIComponent(organization)}`
    );

    // Fetch accessible solutions after membership resolves and poll pending deployments.
    const [solutions] = useApi<z.output<typeof zOrganizationSolutionSummary>[]>(
        `/api/v1/organizations/${membership.organization.id}/solutions`,
        {
            refetchInterval: (query) =>
                query.state.data?.some((solution) => solution.status === 'creating' || solution.deployment_pending)
                    ? 5000
                    : false,
        }
    );

    // Keep the solution lookup and its existence check together.
    const solutionAccess = solutions.find((item) => item.slug === solution);

    if (!solutionAccess) {
        return <NotFoundLayout />;
    }

    const action = <ProfileMenu user={user} />;
    const breadcrumb = <PageBreadcrumb solutionName={solutionAccess.name} />;
    const canMaintain = ['maintain', 'admin', 'owner'].includes(membership.role);

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

    // Show pod logs for accessible failed deployments and the notice otherwise.
    if (deploymentNotice) {
        const notice = (
            <EmptyState
                description={deploymentNotice.description}
                headingLevel={1}
                role="alert"
                title={deploymentNotice.title}
            />
        );

        return (
            <Platform action={action} breadcrumb={breadcrumb} tabs={[]}>
                <NoIndex title={`${solutionAccess.name} | LongLink`} />
                <Center
                    axis={solutionAccess.status === 'failed' ? 'horizontal' : 'both'}
                    minHeight="calc(100vh - 14rem)"
                    padding={6}
                    width="100%"
                >
                    <Stack gap={6} maxWidth={1200} width="100%">
                        {solutionAccess.status === 'failed' && canMaintain ? (
                            <ApiBoundary
                                fallback={<Text color="secondary">Loading pod logs…</Text>}
                                fallbackRender={() => notice}
                            >
                                <DeploymentLogs key={solutionAccess.id} solutionId={solutionAccess.id} />
                            </ApiBoundary>
                        ) : (
                            notice
                        )}
                    </Stack>
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
                <Platform action={action} breadcrumb={breadcrumb} height="fill" tabs={tabs}>
                    <NoIndex title={`${title ?? solutionAccess.name} | LongLink`} />
                    <PageContainer height="100%" minHeight={0} padding={2}>
                        {content}
                    </PageContainer>
                </Platform>
            )}
        </SolutionRuntime>
    );
}

/** Reads failed-deployment logs only for authorized maintainers. */
function DeploymentLogs({ solutionId }: { solutionId: string }) {
    const [logs] = useApi<string[]>(`/api/v1/solutions/${solutionId}/logs`);

    return (
        <Stack gap={2}>
            <Heading level={1}>Solution deployment has failed</Heading>
            {logs.length ? (
                <CodeBlock code={logs.join('\n')} hasLineNumbers maxHeight="60vh" width="100%" />
            ) : (
                <Text color="secondary">No pod logs are available for this deployment.</Text>
            )}
        </Stack>
    );
}
