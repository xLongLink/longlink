import { z } from 'zod';
import { api } from '@/lib/api';
import { useState } from 'react';
import { useApi } from '@/lib/hooks/use-api';
import * as permissions from '@/platform/permissions';
import { Link } from '@/components/longlink/action/link';
import { Separator } from '@/components/shadcn/separator';
import { Stack } from '@/components/longlink/layout/stack';
import { Empty } from '@/components/longlink/display/empty';
import { Button } from '@/components/longlink/action/button';
import { DeletionDialog } from '@/components/dialogs/deletion';
import CreateSolution from '@/components/dialogs/create-solution';
import { SolutionTags } from '@/components/dialogs/solution-tags';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import DeploymentReview from '@/components/dialogs/deployment-review';
import { SolutionMcpDialog } from '@/components/dialogs/solution-mcp';
import { SolutionLogsDialog } from '@/components/dialogs/solution-logs';
import type { OrganizationContext } from '@/platform/layouts/organization';
import { SolutionPermissionsDialog } from '@/components/dialogs/solution-permissions';
import { Ellipsis, ExternalLink, Logs, Plug, Plus, RefreshCw, Shield, Tags, Trash } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/longlink/display/table';
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
    | { kind: 'mcp'; id: string }
    | { kind: 'delete'; item: { id: string; name: string } };

/** Owns Solution loading and dialogs for the overview and active settings section. */
export default function SolutionManagement({
    membership,
    presentation
}: {
    membership: OrganizationContext;
    presentation: 'overview' | 'settings';
}) {
    // Derive Solution actions from the same membership that supplies organization-scoped resources.
    const { organization, tags, activeTag, role } = membership;
    const canMaintain = permissions.canMaintain(role);
    const canAdminister = permissions.canAdminister(role);

    // Own one dialog action; captured identity prevents old completions from closing its replacement.
    const [selected, setSelected] = useState<SolutionAction | null>(null);
    const base = `/api/v1/organizations/${organization.id}`;

    // Keep solution refreshes scoped to the section's resource.
    const [solutions, invalidateSolutions] = useApi(`${base}/solutions`, schemas.zOrganizationSolutionSummary.array());
    const onboarding = presentation === 'overview' && solutions.length === 0;

    const categoryName = activeTag?.name ?? 'Solutions';

    const visibleSolutions =
        presentation === 'settings' || activeTag?.kind === 'all'
            ? solutions
            : solutions.filter((solution) => activeTag && solution.tag_ids?.includes(activeTag.id));

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
            <Stack
                gap={presentation === 'settings' ? 0 : onboarding ? 8 : 4}
                justify={onboarding ? 'center' : undefined}
                className={
                    onboarding
                        ? 'min-h-[calc(100dvh-var(--\\_app-shell-header-height,0px)-var(--platform-toolbar-height,0px)-var(--spacing)*8)]'
                        : undefined
                }
            >
                {presentation === 'settings' ? (
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
                ) : solutions.length > 0 ? (
                    <Stack
                        gap={0}
                        direction="horizontal"
                        justify="between"
                        align="center"
                        wrap="wrap"
                        className="min-h-12"
                    >
                        <h1 className="font-semibold tracking-tight text-4xl">{categoryName}</h1>
                        {canMaintain && <Button onClick={openCreate}>New Solution</Button>}
                    </Stack>
                ) : null}
                {presentation === 'overview' && tags.length === 0 ? (
                    <p className="text-muted-foreground">
                        No tabs configured. Add tabs in organization settings under General.
                    </p>
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
                            <h1 className="font-semibold tracking-tight text-4xl text-center">Your Solutions</h1>
                            <p className="text-muted-foreground text-center">Bring your business processes to life</p>
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
                ) : presentation === 'overview' && visibleSolutions.length === 0 ? (
                    <Stack justify="center" className="min-h-64">
                        <Empty role="status" icon="boxes" title="No solutions in this tab" />
                    </Stack>
                ) : (
                    <Table wrap>
                        {presentation === 'overview' && (
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Solution</TableHead>
                                </TableRow>
                            </TableHeader>
                        )}
                        <TableBody>
                            {visibleSolutions.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell>
                                        <Stack gap={0} align="start">
                                            {presentation === 'overview' ? (
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
                                            ) : (
                                                <Link href={`/orgs/${organization.id}/solutions/${row.id}`}>
                                                    {row.name}
                                                </Link>
                                            )}
                                            {row.description && (
                                                <span className="text-xs text-muted-foreground">{row.description}</span>
                                            )}
                                        </Stack>
                                    </TableCell>
                                    {presentation === 'settings' && (
                                        <TableCell align="end">{row.deployed_version || '—'}</TableCell>
                                    )}
                                    {presentation === 'settings' && canMaintain && (
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
                                                        onClick={() =>
                                                            setSelected({
                                                                kind: 'tags',
                                                                solution: {
                                                                    id: row.id,
                                                                    name: row.name,
                                                                    tag_ids: row.tag_ids
                                                                }
                                                            })
                                                        }
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
                                                            setSelected({
                                                                kind: 'delete',
                                                                item: { id: row.id, name: row.name }
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
                            {visibleSolutions.length === 0 && (
                                <TableRow>
                                    <TableCell
                                        colSpan={
                                            1 +
                                            (presentation === 'settings' ? 1 : 0) +
                                            (presentation === 'settings' && canMaintain ? 1 : 0)
                                        }
                                        align="center"
                                    >
                                        <Empty role="status" title="No data" />
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </Stack>
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
            <DeletionDialog
                confirmation={
                    selected?.kind === 'delete'
                        ? {
                              title: 'Delete solution',
                              description: `Delete solution ${selected.item.name}?`,
                              onDelete: async () => {
                                  // Refresh Solutions only after the delete request succeeds.
                                  await api.delete(`/api/v1/solutions/${selected.item.id}`);
                                  await onSuccess();
                              }
                          }
                        : null
                }
                onClose={closeSelected}
            />
        </>
    );
}
