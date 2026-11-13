import { z } from 'zod';
import { useApi } from '@/lib/hooks/use-api';
import { ProfileMenu } from '@/components/Profile';
import Platform from '@/components/layouts/Platform';
import * as permissions from '@/platform/permissions';
import { ApiBoundary } from '@/components/ApiBoundary';
import { SolutionPage } from '@/components/SolutionPage';
import NotFoundLayout from '@/components/layouts/NotFound';
import { useParams, useOutletContext } from 'react-router';
import { NativeText as Text } from '@/components/ui/NativeText';
import { NativeStack as Stack } from '@/components/ui/NativeStack';
import { NativeEmptyState } from '@/components/ui/NativeEmptyState';
import { NativeHeading as Heading } from '@/components/ui/NativeHeading';
import { NativeCodeBlock as CodeBlock } from '@/components/ui/NativeCodeBlock';
import { OrganizationSwitcher } from '@/platform/components/OrganizationSwitcher';
import { OrganizationBreadcrumb } from '@/platform/components/OrganizationBreadcrumb';
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
                    : false
        }
    );

    // Keep the solution lookup and its existence check together.
    const solutionAccess = solutions.find((item) => item.id === solution);

    if (!solutionAccess) {
        return <NotFoundLayout />;
    }

    const action = <ProfileMenu />;

    const breadcrumb = (
        <OrganizationBreadcrumb organization={membership.organization} solutionName={solutionAccess.name} />
    );

    const canMaintain = permissions.canMaintain(membership.role);

    const deploymentNotice =
        solutionAccess.status === 'creating'
            ? { description: 'Please try again in a moment.', title: 'Solution is being deployed' }
            : solutionAccess.status === 'failed'
              ? {
                    description: 'Review the failed operation in the Platform administration area.',
                    title: 'Solution deployment failed'
                }
              : null;

    // Show pod logs for accessible failed deployments and the notice otherwise.
    if (deploymentNotice) {
        const notice = (
            <div role="alert">
                <NativeEmptyState
                    description={deploymentNotice.description}
                    headingLevel={1}
                    title={deploymentNotice.title}
                />
            </div>
        );

        return (
            <Platform action={action} breadcrumb={breadcrumb} tabs={[]}>
                <title>{`${solutionAccess.name} | LongLink`}</title>
                <div
                    className={`flex min-h-[calc(100vh-14rem)] w-full justify-center p-6 ${solutionAccess.status === 'failed' ? 'items-stretch' : 'items-center'}`}
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
                </div>
            </Platform>
        );
    }

    return (
        <SolutionPage
            action={action}
            breadcrumb={breadcrumb}
            sidebarHeader={<OrganizationSwitcher organization={membership.organization} />}
            formatTitle={(title) => `${title ?? solutionAccess.name} | LongLink`}
            navigationBaseUrl={`/orgs/${organization}/solutions/${solution}`}
            viewsUrl={`/api/v1/solutions/${solutionAccess.id}/proxy/views.json`}
        />
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
