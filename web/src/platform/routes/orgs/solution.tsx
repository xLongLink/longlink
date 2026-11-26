import { z } from 'zod';
import { useApi } from '@/lib/hooks/use-api';
import { ApiBoundary } from '@/components/api';
import { ProfileMenu } from '@/platform/profile';
import Platform from '@/components/layouts/platform';
import * as permissions from '@/platform/permissions';
import { Text } from '@/components/longlink/display/text';
import { SolutionPage } from '@/views/host/solution-page';
import { Stack } from '@/components/longlink/layout/stack';
import { useParams, useOutletContext } from 'react-router';
import NotFoundLayout from '@/components/layouts/not-found';
import { Empty } from '@/components/longlink/display/empty';
import { Heading } from '@/components/longlink/display/heading';
import { OrganizationSwitcher } from '@/components/ui/organization-switcher';
import { OrganizationBreadcrumb } from '@/components/ui/organization-breadcrumb';
import { zUserOrganizationMembership } from '@/lib/generated/platform-api-v1/zod.gen';
import { useOrganizationSolutions } from '@/platform/hooks/use-organization-solutions';
import { CodeBlock, CodeBlockContent, CodeBlockCopyButton } from '@/components/reui/code-block/code-block';

/** Renders one proxy-backed organization solution after membership resolves. */
export default function OrganizationSolution() {
    const { solution = '' } = useParams();
    const membership = useOutletContext<z.output<typeof zUserOrganizationMembership>>();

    const [solutions] = useOrganizationSolutions(membership.organization.id);

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
                <Empty title={<h1>{deploymentNotice.title}</h1>} description={deploymentNotice.description} />
            </div>
        );

        return (
            <Platform action={action} breadcrumb={breadcrumb}>
                <title>{`${solutionAccess.name} | LongLink`}</title>
                <Stack
                    direction="horizontal"
                    gap={0}
                    justify="center"
                    align={solutionAccess.status === 'failed' ? 'stretch' : 'center'}
                    padding={6}
                    className="min-h-[calc(100vh-14rem)] w-full"
                >
                    <Stack gap={6} className="w-full max-w-[1200px]">
                        {solutionAccess.status === 'failed' && canMaintain ? (
                            <ApiBoundary
                                fallback={<Text tone="muted">Loading pod logs…</Text>}
                                fallbackRender={() => notice}
                            >
                                <DeploymentLogs key={solutionAccess.id} solutionId={solutionAccess.id} />
                            </ApiBoundary>
                        ) : (
                            notice
                        )}
                    </Stack>
                </Stack>
            </Platform>
        );
    }

    return (
        <SolutionPage
            action={action}
            breadcrumb={breadcrumb}
            sidebarHeader={<OrganizationSwitcher organization={membership.organization} />}
            formatTitle={(title) => `${title ?? solutionAccess.name} | LongLink`}
            navigationBaseUrl={`/orgs/${membership.organization.id}/solutions/${solution}`}
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
                <CodeBlock code={logs.join('\n')} showLineNumbers>
                    <CodeBlockCopyButton />
                    <div className="max-h-[60vh] overflow-auto" role="region" aria-label="Deployment logs" tabIndex={0}>
                        <CodeBlockContent />
                    </div>
                </CodeBlock>
            ) : (
                <Text tone="muted">No pod logs are available for this deployment.</Text>
            )}
        </Stack>
    );
}
