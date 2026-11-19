import { z } from 'zod';
import { api } from '@/lib/api';
import { useState } from 'react';
import { useApi } from '@/lib/hooks/use-api';
import * as permissions from '@/platform/permissions';
import { SolutionOverview } from './solution-overview';
import { Link } from '@/components/longlink/action/link';
import { Separator } from '@/components/shadcn/separator';
import { Stack } from '@/components/longlink/layout/stack';
import { Empty } from '@/components/longlink/display/empty';
import { Button } from '@/components/longlink/action/button';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { useConfirm } from '@/components/longlink/hooks/use-confirm';
import type { OrganizationContext } from '@/platform/layouts/organization';
import CreateSolution from '@/platform/routes/orgs/dialogs/create-solution';
import { SolutionTags } from '@/platform/routes/orgs/dialogs/solution-tags';
import DeploymentReview from '@/platform/routes/orgs/dialogs/deployment-review';
import { SolutionMcpDialog } from '@/platform/routes/orgs/dialogs/solution-mcp';
import { SolutionLogsDialog } from '@/platform/routes/orgs/dialogs/solution-logs';
import { Ellipsis, Logs, Plug, RefreshCw, Shield, Tags, Trash } from 'lucide-react';
import { Table, TableBody, TableRow, TableCell } from '@/components/longlink/display/table';
import { SolutionPermissionsDialog } from '@/platform/routes/orgs/dialogs/solution-permissions';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/shadcn/dropdown-menu';

type SolutionAction =
    | { kind: 'create' }
    | { kind: 'tags'; solution: Pick<z.output<typeof schemas.zOrganizationSolutionSummary>, 'id' | 'name' | 'tag_ids'> }
    | { kind: 'update'; item: { id: string; name: string } }
    | { kind: 'logs'; id: string }
    | { kind: 'permissions'; id: string }
    | { kind: 'mcp'; id: string };

/** Owns Solution loading and dialogs for the overview and active settings section. */
export default function SolutionManagement({
    membership,
    presentation
}: {
    membership: OrganizationContext;
    presentation: 'overview' | 'settings';
}) {
    // Derive Solution actions from the same membership that supplies organization-scoped resources.
    const { organization, tags, role } = membership;
    const canMaintain = permissions.canMaintain(role);
    const canAdminister = permissions.canAdminister(role);

    // Own one dialog action; captured identity prevents old completions from closing its replacement.
    const [selected, setSelected] = useState<SolutionAction | null>(null);
    const confirmation = useConfirm();
    const base = `/api/v1/organizations/${organization.id}`;

    // Keep solution refreshes scoped to the section's resource.
    const [solutions, invalidateSolutions] = useApi(`${base}/solutions`, schemas.zOrganizationSolutionSummary.array());
    /** Opens creation without replacing an already active creation attempt. */
    function openCreate() {
        setSelected((current) => (current?.kind === 'create' ? current : { kind: 'create' }));
    }

    /** Closes only this selection, leaving a replacement dialog open after an older operation finishes. */
    function closeSelected() {
        // Each render captures the selection that owns its callbacks.
        setSelected((current) => (current === selected ? null : current));
    }

    /** Refreshes Solutions before closing only the attempt that completed successfully. */
    async function onSuccess() {
        // Keep refresh failures in the submitting workflow and leave any replacement dialog untouched.
        await invalidateSolutions();
        closeSelected();
    }

    return (
        <>
            {presentation === 'overview' ? (
                <SolutionOverview membership={membership} solutions={solutions} openCreate={openCreate} />
            ) : (
                <Stack gap={0}>
                    <Stack gap={4}>
                        <Stack
                            gap={0}
                            direction="horizontal"
                            justify="between"
                            align="end"
                            wrap="wrap"
                            className="min-h-8"
                        >
                            <h2 className="font-semibold tracking-tight text-3xl block [text-box-trim:trim-both] [text-box-edge:cap_alphabetic]">
                                Solutions
                            </h2>
                            {canMaintain && (
                                <Button size="sm" onClick={openCreate}>
                                    New Solution
                                </Button>
                            )}
                        </Stack>
                        <Separator />
                    </Stack>
                    <Table wrap>
                        <TableBody>
                            {solutions.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell>
                                        <Stack gap={0} align="start">
                                            <Link href={`/orgs/${organization.id}/solutions/${row.id}`}>
                                                {row.name}
                                            </Link>
                                            {row.description && (
                                                <span className="text-xs text-muted-foreground">{row.description}</span>
                                            )}
                                        </Stack>
                                    </TableCell>
                                    <TableCell align="end">{row.deployed_version || '—'}</TableCell>
                                    {canMaintain && (
                                        <TableCell align="end">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger
                                                    render={
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            aria-label={`Actions for ${row.name}`}
                                                        >
                                                            <Ellipsis aria-hidden="true" />
                                                        </Button>
                                                    }
                                                />
                                                <DropdownMenuContent align="end">
                                                    {canAdminister && (
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                setSelected({ kind: 'permissions', id: row.id })
                                                            }
                                                        >
                                                            <Shield aria-hidden="true" />
                                                            Permissions
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuItem
                                                        onClick={() => setSelected({ kind: 'tags', solution: row })}
                                                    >
                                                        <Tags aria-hidden="true" />
                                                        Tags
                                                    </DropdownMenuItem>
                                                    {row.desired_revision_id &&
                                                        !row.deployment_pending &&
                                                        row.status !== 'creating' && (
                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    // Retain an active attempt so repeated activation cannot replace its draft.
                                                                    setSelected((current) =>
                                                                        current?.kind === 'update'
                                                                            ? current
                                                                            : {
                                                                                  kind: 'update',
                                                                                  item: { id: row.id, name: row.name }
                                                                              }
                                                                    );
                                                                }}
                                                            >
                                                                <RefreshCw aria-hidden="true" />
                                                                Update
                                                            </DropdownMenuItem>
                                                        )}
                                                    <DropdownMenuItem
                                                        onClick={() => setSelected({ kind: 'logs', id: row.id })}
                                                    >
                                                        <Logs aria-hidden="true" />
                                                        Logs
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => setSelected({ kind: 'mcp', id: row.id })}
                                                    >
                                                        <Plug aria-hidden="true" />
                                                        MCP
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            confirmation.show({
                                                                title: 'Delete solution',
                                                                description: `Delete solution ${row.name}?`,
                                                                actionLabel: 'Delete',
                                                                actionVariant: 'destructive',
                                                                onAction: async () => {
                                                                    await api.delete(`/api/v1/solutions/${row.id}`);
                                                                    await invalidateSolutions();
                                                                }
                                                            })
                                                        }
                                                    >
                                                        <Trash aria-hidden="true" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                            {solutions.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={canMaintain ? 3 : 2} align="center">
                                        <Empty role="status" title="No data" />
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Stack>
            )}
            {selected?.kind === 'create' && (
                <CreateSolution organizationId={organization.id} onSuccess={onSuccess} onOpenChange={closeSelected} />
            )}
            {selected?.kind === 'permissions' && (
                <SolutionPermissionsDialog
                    solutionId={selected.id}
                    organizationId={organization.id}
                    onOpenChange={closeSelected}
                />
            )}
            {selected?.kind === 'tags' && (
                <SolutionTags
                    key={selected.solution.id}
                    base={base}
                    tags={tags}
                    solution={selected.solution}
                    onSuccess={onSuccess}
                    onOpenChange={closeSelected}
                />
            )}
            {selected?.kind === 'update' && (
                <DeploymentReview
                    key={selected.item.id}
                    item={selected.item}
                    onSuccess={onSuccess}
                    onOpenChange={closeSelected}
                />
            )}
            {selected?.kind === 'logs' && <SolutionLogsDialog solutionId={selected.id} onOpenChange={closeSelected} />}
            {/* Offer direct MCP connection details and the selected Solution's credential-free package. */}
            {selected?.kind === 'mcp' && <SolutionMcpDialog solutionId={selected.id} onOpenChange={closeSelected} />}
            {confirmation.element}
        </>
    );
}
