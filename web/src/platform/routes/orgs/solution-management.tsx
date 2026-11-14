import { z } from 'zod';
import { api } from '@/lib/api';
import { useState } from 'react';
import { useApi } from '@/lib/hooks/use-api';
import * as permissions from '@/platform/permissions';
import { Separator } from '@/components/shadcn/separator';
import { Illustration } from '@/components/ui/illustration';
import { DeletionDialog } from '@/components/dialogs/deletion';
import CreateSolution from '@/components/dialogs/create-solution';
import { SolutionTags } from '@/components/dialogs/solution-tags';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { NativeLink as Link } from '@/components/custom/native-link';
import { NativeText as Text } from '@/components/custom/native-text';
import DeploymentReview from '@/components/dialogs/deployment-review';
import { SolutionMcpDialog } from '@/components/dialogs/solution-mcp';
import { NativeButton as Button } from '@/components/ui/native-button';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { SolutionLogsDialog } from '@/components/dialogs/solution-logs';
import { DataTable, proportional } from '@/components/custom/data-table';
import { Button as MenuTriggerButton } from '@/components/shadcn/button';
import type { OrganizationContext } from '@/platform/layouts/organization';
import { NativeHeading as Heading } from '@/components/custom/native-heading';
import { SolutionPermissionsDialog } from '@/components/dialogs/solution-permissions';
import { Ellipsis, ExternalLink, Logs, Plug, Plus, RefreshCw, Shield, Tags, Trash } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/shadcn/dropdown-menu';

type Solution = z.output<typeof schemas.zOrganizationSolutionSummary>;

type SolutionAction =
    | { kind: 'create' }
    | { kind: 'tags'; solution: Solution }
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
        // Keep refresh failures in Form and leave any replacement dialog untouched.
        await invalidateSolutions();
        closeSelected();
    }

    return (
        <>
            <Stack
                gap={onboarding ? 8 : 4}
                justify={onboarding ? 'center' : undefined}
                minHeight={
                    onboarding
                        ? 'calc(100dvh - var(--_app-shell-header-height, 0px) - var(--platform-toolbar-height, 0px) - var(--spacing) * 8)'
                        : undefined
                }
            >
                {presentation === 'settings' ? (
                    <>
                        <Stack
                            direction="horizontal"
                            justify="between"
                            align="end"
                            wrap="wrap"
                            minHeight="calc(var(--spacing)*8)"
                        >
                            <Heading
                                level={2}
                                className="block [text-box-trim:trim-both] [text-box-edge:cap_alphabetic]"
                            >
                                Solutions
                            </Heading>
                            {canMaintain && <Button label="New Solution" size="sm" onClick={openCreate} />}
                        </Stack>
                        <Separator />
                    </>
                ) : solutions.length > 0 ? (
                    <Stack direction="horizontal" justify="between" align="center" wrap="wrap" className="min-h-12">
                        <Heading level={1}>{categoryName}</Heading>
                        {canMaintain && <Button label="New Solution" onClick={openCreate} />}
                    </Stack>
                ) : null}
                {presentation === 'overview' && tags.length === 0 ? (
                    <Text as="p" className="text-muted-foreground">
                        No tabs configured. Add tabs in organization settings under General.
                    </Text>
                ) : onboarding ? (
                    <Stack gap={6} align="center">
                        <Illustration
                            src="/images/solution.png"
                            alt=""
                            className="size-20 object-contain"
                            width={272}
                            height={279}
                            decoding="async"
                        />
                        <Stack gap={0}>
                            <Heading level={1} className="text-center">
                                Your Solutions
                            </Heading>
                            <Text as="p" className="text-muted-foreground text-center">
                                Bring your business processes to life
                            </Text>
                        </Stack>
                        <Stack direction="horizontal" gap={3} justify="center" wrap="wrap">
                            <Button
                                label="Read the docs"
                                variant="outline"
                                href="/docs/"
                                target="_blank"
                                rel="noopener noreferrer"
                                endContent={<ExternalLink className="size-4" aria-hidden="true" />}
                            />
                            {canMaintain && (
                                <Button
                                    label="Create solution"
                                    variant="default"
                                    icon={<Plus className="size-4" aria-hidden="true" />}
                                    onClick={openCreate}
                                />
                            )}
                        </Stack>
                    </Stack>
                ) : presentation === 'overview' && visibleSolutions.length === 0 ? (
                    <Text as="p" className="text-muted-foreground">
                        No Solutions in this category.
                    </Text>
                ) : (
                    <DataTable
                        data={visibleSolutions}
                        idKey="id"
                        hasHover
                        density="compact"
                        columns={[
                            {
                                key: 'name',
                                header: 'Solution',
                                width: proportional(1),
                                renderCell: (row) => (
                                    <Stack gap={presentation === 'overview' ? 0 : undefined}>
                                        {presentation === 'overview' ? (
                                            <Stack direction="horizontal" gap={1} align="center">
                                                <Link href={`/orgs/${organization.id}/solutions/${row.id}`}>
                                                    {row.name}
                                                </Link>
                                                {row.status !== 'running' && (
                                                    <Text
                                                        className={
                                                            row.status === 'creating'
                                                                ? 'text-xs text-info-foreground'
                                                                : 'text-xs text-destructive-foreground'
                                                        }
                                                    >
                                                        {row.status === 'creating' ? 'Creating' : 'Failed'}
                                                    </Text>
                                                )}
                                            </Stack>
                                        ) : (
                                            <Link href={`/orgs/${organization.id}/solutions/${row.id}`}>
                                                {row.name}
                                            </Link>
                                        )}
                                        {row.description && (
                                            <Text className="text-xs text-muted-foreground">{row.description}</Text>
                                        )}
                                    </Stack>
                                )
                            },
                            ...(presentation === 'settings'
                                ? [
                                      {
                                          key: 'deployed_version',
                                          header: 'Version',
                                          align: 'end' as const,
                                          width: proportional(0.25, { minWidth: 0 }),
                                          renderCell: (row: Solution) => row.deployed_version || '—'
                                      }
                                  ]
                                : []),
                            ...(presentation === 'settings' && canMaintain
                                ? [
                                      {
                                          key: 'id',
                                          header: 'Actions',
                                          align: 'end' as const,
                                          width: proportional(0.25, { minWidth: 0 }),
                                          renderCell: (row: Solution) => (
                                              <DropdownMenu>
                                                  <DropdownMenuTrigger
                                                      render={
                                                          <MenuTriggerButton
                                                              type="button"
                                                              variant="ghost"
                                                              size="icon-sm"
                                                              aria-label={`Actions for ${row.name}`}
                                                          >
                                                              <Ellipsis aria-hidden="true" />
                                                          </MenuTriggerButton>
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
                                          )
                                      }
                                  ]
                                : [])
                        ]}
                    />
                )}
            </Stack>
            {selected?.kind === 'create' && (
                <CreateSolution organizationId={organization.id} onSuccess={onSuccess} onClose={closeSelected} />
            )}
            {selected?.kind === 'permissions' && (
                <SolutionPermissionsDialog
                    solutionId={selected.id}
                    organizationId={organization.id}
                    onClose={closeSelected}
                />
            )}
            {selected?.kind === 'tags' && (
                <SolutionTags
                    key={selected.solution.id}
                    base={base}
                    tags={tags}
                    solution={selected.solution}
                    onSuccess={onSuccess}
                    onClose={closeSelected}
                />
            )}
            {selected?.kind === 'update' && (
                <DeploymentReview
                    key={selected.item.id}
                    item={selected.item}
                    onSuccess={onSuccess}
                    onClose={closeSelected}
                />
            )}
            {selected?.kind === 'logs' && <SolutionLogsDialog solutionId={selected.id} onClose={closeSelected} />}
            {/* Offer direct MCP connection details and the selected Solution's credential-free package. */}
            {selected?.kind === 'mcp' && <SolutionMcpDialog solutionId={selected.id} onClose={closeSelected} />}
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
