import { z } from 'zod';
import { useApi } from '@/lib/hooks/use-api';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { ProfileMenu } from '@/components/Profile';
import { Center } from '@astryxdesign/core/Center';
import Platform from '@/components/layouts/Platform';
import { Heading } from '@astryxdesign/core/Heading';
import { ApiBoundary } from '@/components/ApiBoundary';
import { SolutionRuntime } from '@/components/Solution';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import NotFoundLayout from '@/components/layouts/NotFound';
import { PageContainer } from '@/components/PageContainer';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { useParams, useOutletContext } from 'react-router';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { zUserOrganizationMembership, zOrganizationSolutionSummary } from '@/lib/generated/platform-api-v1/zod.gen';

/** Renders one proxy-backed organization solution after membership resolves. */
export default function OrganizationSolution() {
    const { organization = '', solution = '' } = useParams();
    const membership = useOutletContext<z.output<typeof zUserOrganizationMembership>>();

    // Fetch accessible solutions after membership resolves and poll pending deployments.
    const [solutions] = useApi(
        `/api/v1/organizations/${membership.organization.id}/solutions`,
        zOrganizationSolutionSummary.array(),
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

    const action = <ProfileMenu />;
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
                <title>{`${solutionAccess.name} | LongLink`}</title>
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
                <Platform action={action} breadcrumb={breadcrumb} tabs={tabs}>
                    <title>{`${title ?? solutionAccess.name} | LongLink`}</title>
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
    const [logs] = useApi(`/api/v1/solutions/${solutionId}/logs`, z.array(z.string()));

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
