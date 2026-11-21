import { z } from 'zod';
import { ExternalLink, Plus } from 'lucide-react';
import * as permissions from '@/platform/permissions';
import { Link } from '@/components/longlink/action/link';
import { Text } from '@/components/longlink/display/text';
import { Stack } from '@/components/longlink/layout/stack';
import { Empty } from '@/components/longlink/display/empty';
import { Button } from '@/components/longlink/action/button';
import { Heading } from '@/components/longlink/display/heading';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import type { OrganizationContext } from '@/platform/layouts/organization';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/longlink/display/table';

export function SolutionOverview({
    membership,
    solutions,
    openCreate
}: {
    membership: OrganizationContext;
    solutions: z.output<typeof schemas.zOrganizationSolutionSummary>[];
    openCreate: () => void;
}) {
    const { organization, tags, activeTag, role } = membership;
    const canMaintain = permissions.canMaintain(role);
    const onboarding = solutions.length === 0;
    const categoryName = activeTag?.name ?? 'Solutions';

    const visibleSolutions =
        activeTag?.kind === 'all'
            ? solutions
            : solutions.filter((solution) => activeTag && solution.tag_ids?.includes(activeTag.id));

    return (
        <Stack
            gap={onboarding ? 8 : 4}
            justify={onboarding ? 'center' : undefined}
            className={onboarding ? 'min-h-(--page-content-height)' : undefined}
        >
            {solutions.length > 0 ? (
                <Stack gap={0} direction="horizontal" justify="between" align="center" wrap="wrap" className="min-h-12">
                    <Heading level={1}>{categoryName}</Heading>
                    {canMaintain && <Button onClick={openCreate}>New Solution</Button>}
                </Stack>
            ) : null}
            {tags.length === 0 ? (
                <Text as="p" tone="muted">
                    No tabs configured. Add tabs in organization settings under General.
                </Text>
            ) : onboarding ? (
                <Stack gap={6} align="center">
                    <img
                        src="/images/solution.png"
                        alt=""
                        className="size-20 object-contain invert dark:invert-0"
                        width={272}
                        height={279}
                        decoding="async"
                    />
                    <Stack gap={0}>
                        <Heading level={1} align="center">
                            Your Solutions
                        </Heading>
                        <Text as="p" tone="muted" align="center">
                            Bring your business processes to life
                        </Text>
                    </Stack>
                    <Stack direction="horizontal" gap={3} justify="center" wrap="wrap">
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
                    </Stack>
                </Stack>
            ) : visibleSolutions.length === 0 ? (
                <Stack justify="center" className="min-h-64">
                    <Empty role="status" icon="boxes" title="No solutions in this tab" />
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
                                                <span
                                                    className={
                                                        row.status === 'creating'
                                                            ? 'text-xs text-info-foreground'
                                                            : 'text-xs text-destructive-foreground'
                                                    }
                                                >
                                                    {row.status === 'creating' ? 'Creating' : 'Failed'}
                                                </span>
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
    );
}
