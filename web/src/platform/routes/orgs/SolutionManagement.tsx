import { z } from 'zod';
import { api } from '@/lib/api';
import { useState } from 'react';
import { SolutionTags } from './Tags';
import { useApi } from '@/lib/hooks/use-api';
import CreateSolution from './CreateSolution';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { useSearchParams } from 'react-router';
import { Dialog } from '@/components/ui/Dialog';
import { OpenAI } from '@/components/svg/OpenAI';
import { Button } from '@astryxdesign/core/Button';
import { useToast } from '@astryxdesign/core/Toast';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { ApiBoundary } from '@/components/ApiBoundary';
import { DeletionDialog } from '@/components/Deletion';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Illustration } from '@/components/Illustration';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Stack, StackItem } from '@astryxdesign/core/Stack';
import { Table, proportional } from '@astryxdesign/core/Table';
import DeploymentReview, { type Update } from './DeploymentReview';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { Layout, LayoutPanel, LayoutContent } from '@astryxdesign/core/Layout';
import { ExternalLink, Logs, Plug, Plus, RefreshCw, Tags, Trash } from 'lucide-react';

type Solution = z.output<typeof schemas.zOrganizationSolutionSummary>;

type SolutionAction =
    | { kind: 'create' }
    | { kind: 'tags'; solution: Solution }
    | ({ kind: 'update' } & Update)
    | { kind: 'logs'; id: string }
    | { kind: 'mcp' | 'delete'; item: { id: string; name: string } };

/** Owns Solution loading and dialogs for the overview and active settings section. */
export default function SolutionManagement({
    organization,
    canMaintain,
    presentation,
}: {
    organization: z.output<typeof schemas.zUserOrganizationMembership>['organization'];
    canMaintain: boolean;
    presentation: 'overview' | 'settings';
}) {
    // Own one dialog action; captured identity prevents old completions from closing its replacement.
    const [selected, setSelected] = useState<SolutionAction | null>(null);
    const base = `/api/v1/organizations/${organization.id}`;

    // Keep solution refreshes scoped to the section's resource.
    const [solutions, invalidateSolutions] = useApi(`${base}/solutions`, schemas.zOrganizationSolutionSummary.array());
    const [tags] = useApi(`${base}/tags`, schemas.zOrganizationTagResponse.array());
    const [searchParams] = useSearchParams();
    const onboarding = presentation === 'overview' && solutions.length === 0;

    // Deleted or unknown tab links select the first remaining saved filter.
    const requestedTag = searchParams.get('tag');

    const activeTag = tags.find((tag) => tag.id === requestedTag) ?? tags[0];

    const categoryName = activeTag?.name ?? 'Solutions';

    const visibleSolutions =
        presentation === 'settings' || activeTag?.kind === 'all'
            ? solutions
            : solutions.filter((solution) => activeTag && solution.tag_ids?.includes(activeTag.id));

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
                        ? 'calc(100dvh - var(--_app-shell-header-height, 0px) * 2 - var(--spacing-8))'
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
                            minHeight="var(--size-element-md)"
                        >
                            <Heading level={2} hasCapsize>
                                Solutions
                            </Heading>
                            {canMaintain && (
                                <Button
                                    label="New Solution"
                                    size="sm"
                                    onClick={() =>
                                        setSelected((current) =>
                                            current?.kind === 'create' ? current : { kind: 'create' }
                                        )
                                    }
                                />
                            )}
                        </Stack>
                        <Divider />
                    </>
                ) : solutions.length > 0 ? (
                    <Stack direction="horizontal" justify="between" align="center" wrap="wrap" className="min-h-12">
                        <Heading level={1}>{categoryName}</Heading>
                        {canMaintain && (
                            <Button
                                label="New Solution"
                                onClick={() =>
                                    setSelected((current) =>
                                        current?.kind === 'create' ? current : { kind: 'create' }
                                    )
                                }
                            />
                        )}
                    </Stack>
                ) : null}
                {presentation === 'overview' && tags.length === 0 ? (
                    <Text as="p" color="secondary">
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
                            <Heading level={1} justify="center">
                                Your Solutions
                            </Heading>
                            <Text as="p" color="secondary" justify="center">
                                Bring your business processes to life
                            </Text>
                        </Stack>
                        <Stack direction="horizontal" gap={3} justify="center" wrap="wrap">
                            <Button
                                label="Read the docs"
                                variant="secondary"
                                href="/docs/"
                                target="_blank"
                                rel="noopener noreferrer"
                                endContent={<ExternalLink className="size-4" aria-hidden="true" />}
                            />
                            {canMaintain && (
                                <Button
                                    label="Create solution"
                                    variant="primary"
                                    icon={<Plus className="size-4" aria-hidden="true" />}
                                    onClick={() =>
                                        setSelected((current) =>
                                            current?.kind === 'create' ? current : { kind: 'create' }
                                        )
                                    }
                                />
                            )}
                        </Stack>
                    </Stack>
                ) : presentation === 'overview' && visibleSolutions.length === 0 ? (
                    <Text as="p" color="secondary">
                        No Solutions in this category.
                    </Text>
                ) : (
                    <Table
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
                                                <Link href={`/orgs/${organization.slug}/solutions/${row.slug}`}>
                                                    {row.name}
                                                </Link>
                                                {row.status !== 'running' && (
                                                    <Text
                                                        className={
                                                            row.status === 'creating'
                                                                ? 'text-(--color-text-blue)'
                                                                : 'text-error'
                                                        }
                                                        type="supporting"
                                                    >
                                                        {row.status === 'creating' ? 'Creating' : 'Failed'}
                                                    </Text>
                                                )}
                                            </Stack>
                                        ) : (
                                            <Link href={`/orgs/${organization.slug}/solutions/${row.slug}`}>
                                                {row.name}
                                            </Link>
                                        )}
                                        {row.description && <Text type="supporting">{row.description}</Text>}
                                    </Stack>
                                ),
                            },
                            ...(presentation === 'settings'
                                ? [
                                      {
                                          key: 'tag_ids',
                                          header: 'Tags',
                                          width: proportional(0.5),
                                          renderCell: (row: Solution) =>
                                              tags
                                                  .filter((tag) => row.tag_ids?.includes(tag.id))
                                                  .map((tag) => tag.name)
                                                  .join(', ') || '—',
                                      },
                                      {
                                          key: 'deployed_version',
                                          header: 'Version',
                                          align: 'end' as const,
                                          width: proportional(0.25, { minWidth: 0 }),
                                          renderCell: (row: Solution) => row.deployed_version || '—',
                                      },
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
                                              <MoreMenu
                                                  alignment="end"
                                                  size="sm"
                                                  items={[
                                                      {
                                                          id: 'tags',
                                                          label: 'Tags',
                                                          icon: <Tags className="size-4" aria-hidden="true" />,
                                                          onClick: () => setSelected({ kind: 'tags', solution: row }),
                                                      },
                                                      ...(row.desired_revision_id &&
                                                      !row.deployment_pending &&
                                                      row.status !== 'creating'
                                                          ? [
                                                                {
                                                                    id: 'update',
                                                                    label: 'Update',
                                                                    icon: (
                                                                        <RefreshCw
                                                                            className="size-4"
                                                                            aria-hidden="true"
                                                                        />
                                                                    ),
                                                                    onClick: () => {
                                                                        // Retain an active attempt so repeated activation cannot replace its draft.
                                                                        setSelected((current) =>
                                                                            current?.kind === 'update'
                                                                                ? current
                                                                                : {
                                                                                      kind: 'update',
                                                                                      key: crypto.randomUUID(),
                                                                                      item: {
                                                                                          id: row.id,
                                                                                          name: row.name,
                                                                                      },
                                                                                  }
                                                                        );
                                                                    },
                                                                },
                                                            ]
                                                          : []),
                                                      {
                                                          id: 'logs',
                                                          label: 'Logs',
                                                          icon: <Logs className="size-4" aria-hidden="true" />,
                                                          onClick: () => setSelected({ kind: 'logs', id: row.id }),
                                                      },
                                                      {
                                                          id: 'mcp',
                                                          label: 'MCP',
                                                          icon: <Plug className="size-4" aria-hidden="true" />,
                                                          onClick: () =>
                                                              setSelected({
                                                                  kind: 'mcp',
                                                                  item: { id: row.id, name: row.name },
                                                              }),
                                                      },
                                                      {
                                                          id: 'delete',
                                                          label: 'Delete',
                                                          icon: <Trash className="size-4" aria-hidden="true" />,
                                                          onClick: () =>
                                                              setSelected({
                                                                  kind: 'delete',
                                                                  item: { id: row.id, name: row.name },
                                                              }),
                                                      },
                                                  ]}
                                              />
                                          ),
                                      },
                                  ]
                                : []),
                        ]}
                    />
                )}
            </Stack>
            {selected?.kind === 'create' && (
                <CreateSolution organizationId={organization.id} onSuccess={onSuccess} onClose={closeSelected} />
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
                <DeploymentReview key={selected.key} update={selected} onSuccess={onSuccess} onClose={closeSelected} />
            )}
            {selected?.kind === 'logs' && (
                <Dialog
                    isOpen
                    onOpenChange={(open) => {
                        if (!open) closeSelected();
                    }}
                >
                    <Stack height="min(560px, calc(100dvh - var(--spacing-10) * 4))" paddingInline={8} paddingBlock={4}>
                        <ApiBoundary key={selected.id}>
                            <SolutionLogs solutionId={selected.id} onClose={closeSelected} />
                        </ApiBoundary>
                    </Stack>
                </Dialog>
            )}
            {/* Offer direct MCP connection details and the selected Solution's credential-free package. */}
            {selected?.kind === 'mcp' && (
                <Dialog
                    isOpen
                    onOpenChange={(open) => {
                        if (!open) closeSelected();
                    }}
                >
                    <Stack height="min(560px, calc(100dvh - var(--spacing-10) * 4))">
                        <Layout
                            padding={0}
                            end={
                                <LayoutPanel width="50%" padding={0} className="hidden bg-muted md:flex">
                                    <Stack width="100%" height="100%" align="center" justify="center" padding={6}>
                                        <Illustration
                                            src="/images/mcp.png"
                                            alt="Hand-drawn globe surrounded by orbiting spheres."
                                            className="h-full w-full object-contain"
                                            width={941}
                                            height={1672}
                                            decoding="async"
                                        />
                                    </Stack>
                                </LayoutPanel>
                            }
                            content={
                                <LayoutContent padding={8} isScrollable>
                                    <Stack
                                        minHeight="100%"
                                        justify="center"
                                        width="max-content"
                                        maxWidth="100%"
                                        gap={6}
                                        className="mx-auto"
                                    >
                                        <Stack gap={2} align="center">
                                            <Plug className="size-20 text-secondary" aria-hidden="true" />
                                            <Stack gap={0}>
                                                <Heading level={2} justify="center">
                                                    Model Context Protocol
                                                </Heading>
                                                <Text as="p" color="secondary" justify="center">
                                                    Connect your solution to AI tools
                                                </Text>
                                            </Stack>
                                        </Stack>
                                        {/* Match the creation dialog's content-sized column and control width. */}
                                        <Stack gap={4} width={0} className="min-w-full">
                                            <ApiBoundary key={selected.item.id}>
                                                <SolutionMcpUrl solutionId={selected.item.id} onClose={closeSelected} />
                                            </ApiBoundary>
                                            <Button
                                                as="a"
                                                href={`/api/v1/solutions/${selected.item.id}/plugin`}
                                                label="Download plugin ZIP"
                                                variant="primary"
                                                width="100%"
                                                icon={
                                                    <OpenAI
                                                        className="size-5 scale-125"
                                                        aria-hidden="true"
                                                        focusable="false"
                                                    />
                                                }
                                            />
                                        </Stack>
                                    </Stack>
                                </LayoutContent>
                            }
                        />
                    </Stack>
                </Dialog>
            )}
            <DeletionDialog
                confirmation={
                    selected?.kind === 'delete'
                        ? {
                              title: 'Delete solution',
                              description: `Delete solution ${selected.item.name}?`,
                              onDelete: async () => {
                                  // Refresh Solutions only after the delete request succeeds.
                                  await api.delete(`/api/v1/solutions/${selected.item.id}`);
                                  await invalidateSolutions();
                                  closeSelected();
                              },
                          }
                        : null
                }
                onClose={closeSelected}
            />
        </>
    );
}

/** Reads the canonical public connection URL without guessing the deployment's origin. */
function SolutionMcpUrl({ solutionId, onClose }: { solutionId: string; onClose: () => void }) {
    const showToast = useToast();

    // Reuse OAuth discovery so the copied URL matches the plugin's configured public address.
    const [{ resource }] = useApi(
        `/.well-known/oauth-protected-resource/api/v1/solutions/${solutionId}/proxy/mcp`,
        schemas.zResourceMetadata
    );

    return (
        <Button
            label="Copy MCP server URL"
            width="100%"
            clickAction={async () => {
                // Copy only the canonical connection URL, without credentials.
                await navigator.clipboard.writeText(resource);

                // Confirm a successful copy and dismiss the MCP dialog.
                showToast({ body: 'Copied' });
                onClose();
            }}
        />
    );
}

/** Loads pod logs only while their dialog is open. */
function SolutionLogs({ solutionId, onClose }: { solutionId: string; onClose: () => void }) {
    const [logs, invalidate] = useApi(`/api/v1/solutions/${solutionId}/logs`, z.array(z.string()));

    // Keep log scrolling inside CodeBlock while dismissal and refresh remain visible.
    return (
        <Stack gap={3} height="100%">
            <StackItem size="fill">
                <CodeBlock
                    code={logs.join('\n')}
                    hasLineNumbers
                    isWrapped
                    size="sm"
                    width="100%"
                    maxHeight="100%"
                    className="h-full"
                />
            </StackItem>
            <Stack direction="horizontal" gap={2} justify="between" wrap="wrap">
                <Button label="Close" variant="ghost" onClick={onClose} />
                <Button
                    label="Refresh logs"
                    variant="secondary"
                    icon={<RefreshCw className="size-4" aria-hidden="true" />}
                    clickAction={invalidate}
                />
            </Stack>
        </Stack>
    );
}
