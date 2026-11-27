import { useOutletContext } from 'react-router';
import { ExternalLink, Plus } from 'lucide-react';
import * as permissions from '@/platform/permissions';
import { Link } from '@/components/longlink/action/link';
import { useSelection } from '@/lib/hooks/use-selection';
import { Text } from '@/components/longlink/display/text';
import { Stack } from '@/components/longlink/layout/stack';
import { Badge } from '@/components/longlink/display/badge';
import { Empty } from '@/components/longlink/display/empty';
import { Button } from '@/components/longlink/action/button';
import { Heading } from '@/components/longlink/display/heading';
import type { OrganizationContext } from '@/platform/layouts/organization';
import CreateSolution from '@/platform/routes/orgs/dialogs/create-solution';
import { useOrganizationSolutions } from '@/platform/hooks/use-organization-solutions';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/longlink/display/table';

/** Lists an organization's Solutions; the layout owns organization-scoped state resets. */
export default function Organization() {
    const membership = useOutletContext<OrganizationContext>();
    const [solutions, invalidateSolutions] = useOrganizationSolutions(membership.organization.id);
    const [creation, setCreation, closeCreation] = useSelection<{ kind: 'create' }>();
    const { organization, tags, activeTag, role } = membership;
    const canMaintain = permissions.canMaintain(role);
    const onboarding = solutions.length === 0;
    const categoryName = activeTag?.name ?? 'Solutions';

    const visibleSolutions =
        activeTag?.kind === 'all'
            ? solutions
            : solutions.filter((solution) => activeTag && solution.tag_ids?.includes(activeTag.id));

    function openCreate() {
        setCreation((current) => current ?? { kind: 'create' });
    }

    async function onSuccess() {
        await invalidateSolutions();
        closeCreation();
    }

    return (
        <>
            <title>Organization Solutions | LongLink</title>
            <Stack
                gap={4}
                justify={onboarding ? 'center' : undefined}
                className={onboarding ? 'min-h-(--page-content-height)' : undefined}
            >
                {solutions.length > 0 ? (
                    <Stack
                        gap={0}
                        direction="horizontal"
                        justify="between"
                        align="center"
                        wrap="wrap"
                        className="min-h-12"
                    >
                        <Heading level={1}>{categoryName}</Heading>
                        {canMaintain && <Button onClick={openCreate}>New Solution</Button>}
                    </Stack>
                ) : null}
                {tags.length === 0 ? (
                    <Empty
                        title={onboarding ? <h1>No tabs configured</h1> : 'No tabs configured'}
                        description={
                            canMaintain
                                ? 'Add tabs in organization settings under General.'
                                : 'Ask an organization maintainer to add a tab.'
                        }
                    />
                ) : onboarding ? (
                    <Empty
                        icon="boxes"
                        title={<h1>Your Solutions</h1>}
                        description={
                            canMaintain
                                ? 'Create your first solution to get started.'
                                : 'No solutions have been created in this organization yet.'
                        }
                    >
                        <Link variant="outline" href="/docs/" target="_blank">
                            Read the docs
                            <ExternalLink className="size-4" aria-hidden="true" />
                        </Link>
                        {canMaintain && (
                            <Button onClick={openCreate}>
                                <Plus className="size-4" aria-hidden="true" />
                                Create solution
                            </Button>
                        )}
                    </Empty>
                ) : visibleSolutions.length === 0 ? (
                    <Stack justify="center" className="min-h-64" role="status">
                        <Empty icon="boxes" title="No solutions in this tab" />
                    </Stack>
                ) : (
                    <Table wrap>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Solution</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visibleSolutions.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell>
                                        <Stack gap={0} align="start">
                                            <Stack direction="horizontal" gap={1} align="center">
                                                <Link href={`/orgs/${organization.id}/solutions/${row.id}`}>
                                                    {row.name}
                                                </Link>
                                                {row.status !== 'running' && (
                                                    <Badge
                                                        variant={
                                                            row.status === 'creating' ? 'secondary' : 'destructive'
                                                        }
                                                    >
                                                        {row.status === 'creating' ? 'Creating' : 'Failed'}
                                                    </Badge>
                                                )}
                                            </Stack>
                                            {row.description && (
                                                <Text size="xs" tone="muted">
                                                    {row.description}
                                                </Text>
                                            )}
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Stack>
            {creation && (
                <CreateSolution organizationId={organization.id} onSuccess={onSuccess} onClose={closeCreation} />
            )}
        </>
    );
}
