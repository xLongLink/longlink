import { z } from 'zod';
import { useApi } from '@/lib/hooks/use-api';
import { ApiBoundary } from '@/components/api';
import Platform from '@/components/layouts/platform';
import { ProfileMenu } from '@/components/ui/profile';
import * as permissions from '@/platform/permissions';
import { useParams, useOutletContext } from 'react-router';
import NotFoundLayout from '@/components/layouts/not-found';
import { SolutionPage } from '@/components/ui/solution-page';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { OrganizationSwitcher } from '@/components/ui/organization-switcher';
import { OrganizationBreadcrumb } from '@/components/ui/organization-breadcrumb';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/shadcn/empty';
import { CodeBlock, CodeBlockContent, CodeBlockCopyButton } from '@/components/reui/code-block/code-block';
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
                <Empty>
                    <EmptyHeader>
                        <EmptyTitle>
                            <h1>{deploymentNotice.title}</h1>
                        </EmptyTitle>
                        <EmptyDescription>{deploymentNotice.description}</EmptyDescription>
                    </EmptyHeader>
                </Empty>
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
                                fallback={<span className="text-muted-foreground">Loading pod logs…</span>}
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
            <h1 className="font-semibold tracking-tight text-4xl">Solution deployment has failed</h1>
            {logs.length ? (
                <CodeBlock code={logs.join('\n')} showLineNumbers>
                    <CodeBlockCopyButton />
                    <div className="max-h-[60vh] overflow-auto" role="region" aria-label="Deployment logs" tabIndex={0}>
                        <CodeBlockContent />
                    </div>
                </CodeBlock>
            ) : (
                <span className="text-muted-foreground">No pod logs are available for this deployment.</span>
            )}
        </Stack>
    );
}
