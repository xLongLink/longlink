import type { z } from 'zod';
import { api } from '@/lib/api';
import Registries from './Registries';
import { useApi } from '@/lib/hooks/use-api';
import CreateSolution from './CreateSolution';
import { NoIndex } from '@/components/NoIndex';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { useState, useTransition } from 'react';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { RefreshCw, Logs, Trash } from 'lucide-react';
import { ApiBoundary } from '@/components/ApiBoundary';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Selector } from '@astryxdesign/core/Selector';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Stack, StackItem } from '@astryxdesign/core/Stack';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { Table, proportional } from '@astryxdesign/core/Table';
import { DeletionDialog } from '@/platform/components/Deletion';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { useResolvedOrganizationMembership } from '@/lib/hooks/use-organization';
import { Menu, MenuSection, MenuItem, MenuSubSection } from '@/components/ui/Menu';

type Solution = z.output<typeof schemas.zOrganizationSolutionSummary>;

type Update = {
    // Remount drafts for every fresh check, including checks of the same revision.
    key: string;
    item: { id: string; name: string };
    candidate: z.output<typeof schemas.zSolutionUpdateCheck>;
};

type DeploymentReviewProps = {
    update: Update;
    invalidate: () => Promise<void>;
    onClose: () => void;
};

/** Abbreviates digest references for release comparison while preserving tag-only images. */
function imageDigest(image: string) {
    // Keep the first twelve digest characters without changing authoritative image values.
    return image.match(/@(sha256:[a-f0-9]{12})[a-f0-9]*$/)?.[1] ?? image;
}

/** Owns the deployment draft and submission for a freshly checked candidate. */
function DeploymentReview({ update, invalidate, onClose }: DeploymentReviewProps) {
    const [envs, setEnvs] = useState<Record<string, { value?: string; removed?: boolean }>>({});

    // Preserve configured required secrets, and require values for new required environments.
    const missingRequired = (update.candidate.metadata.environments ?? []).some(
        (environment) =>
            environment.required &&
            (envs[environment.name]?.removed === true ||
                (!update.candidate.configured_envs.includes(environment.name) &&
                    !envs[environment.name]?.value?.trim()))
    );

    const hasChanges =
        update.candidate.metadata.image !== update.candidate.current_image ||
        Object.values(envs).some((environment) => environment.value !== undefined || environment.removed === true);

    /** Submits the reviewed deployment while preserving untouched secrets. */
    async function updateSolution() {
        if (missingRequired || !hasChanges) return;

        // Send edited secrets and explicit removals, preserving omitted values.
        const patchEnvs: Record<string, string | null> = {};

        // Removal takes precedence without discarding the edit retained for untoggling.
        for (const [name, environment] of Object.entries(envs)) {
            if (environment.removed === true) patchEnvs[name] = null;
            else if (environment.value !== undefined) patchEnvs[name] = environment.value;
        }

        await api.post(`/api/v1/solutions/${update.item.id}/update`, {
            json: schemas.zSolutionPatch.parse({
                envs: patchEnvs,
                expected_revision_id: update.candidate.revision_id,
            }),
        });
        await invalidate();
        onClose();
    }

    return (
        <Dialog
            isOpen
            purpose="form"
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogHeader title={`Update ${update.item.name}`} onOpenChange={onClose} />
            <form action={updateSolution}>
                <Stack gap={3}>
                    <Stack direction="horizontal" gap={2} align="center" wrap="wrap">
                        <Text type="supporting" color="secondary">
                            Current {imageDigest(update.candidate.current_image)}
                        </Text>
                        <Text type="supporting" color="primary">
                            New {imageDigest(update.candidate.metadata.image)}
                        </Text>
                    </Stack>
                    {(update.candidate.metadata.environments ?? []).map((environment) => {
                        const configured = update.candidate.configured_envs.includes(environment.name);
                        const draft = envs[environment.name];
                        const isRemoved = draft?.removed === true;

                        // Configured secrets remain hidden; blank untouched inputs preserve them.
                        return (
                            <Stack key={environment.name} gap={2}>
                                <TextInput
                                    label={environment.name}
                                    labelTooltip={environment.description ?? undefined}
                                    type="password"
                                    value={draft?.value ?? ''}
                                    isDisabled={isRemoved}
                                    isOptional={!environment.required}
                                    isRequired={environment.required && (!configured || isRemoved)}
                                    placeholder={
                                        isRemoved
                                            ? 'Will be removed'
                                            : configured
                                              ? 'Configured: preserve existing value'
                                              : environment.description || 'Enter value'
                                    }
                                    onChange={(value) =>
                                        setEnvs((current) => ({
                                            ...current,
                                            [environment.name]: { ...current[environment.name], value },
                                        }))
                                    }
                                />
                                {configured && !environment.required && (
                                    <CheckboxInput
                                        label={`Remove ${environment.name}`}
                                        value={isRemoved}
                                        onChange={(removed) =>
                                            setEnvs((current) => ({
                                                ...current,
                                                [environment.name]: { ...current[environment.name], removed },
                                            }))
                                        }
                                    />
                                )}
                            </Stack>
                        );
                    })}
                    <Stack direction="horizontal" gap={2} justify="end" wrap="wrap">
                        <Button label="Cancel" variant="ghost" onClick={onClose} />
                        <Button
                            label="Update solution"
                            variant="primary"
                            type="submit"
                            isDisabled={missingRequired || !hasChanges}
                        />
                    </Stack>
                </Stack>
            </form>
        </Dialog>
    );
}

/** Shares organization identity and permissions while sections own resource lifetimes. */
export default function OrganizationSettings() {
    const membership = useResolvedOrganizationMembership();
    const base = `/api/v1/organizations/${membership.organization.id}`;

    // Share the layout-resolved identity and permissions without loading inactive sections.
    const canMaintain = ['maintain', 'admin', 'owner'].includes(membership.role);
    const canAdminister = ['admin', 'owner'].includes(membership.role);

    return (
        <Stack gap={8}>
            <NoIndex title="Organization Settings | LongLink" />
            <Stack direction="horizontal" gap={3} align="center">
                <Avatar kind="organization" name={membership.organization.name} />
                <Stack gap={0}>
                    <Heading level={4} accessibilityLevel={1}>
                        {membership.organization.name}
                    </Heading>
                    <Text type="supporting">Organization</Text>
                </Stack>
            </Stack>
            <Menu>
                <MenuSection title="Settings" isHeaderHidden>
                    <MenuItem label="Usage" icon="building2">
                        <ApiBoundary key="storage">
                            <StorageSection base={base} />
                        </ApiBoundary>
                    </MenuItem>
                    <MenuItem label="Connections" icon="boxes">
                        <ApiBoundary key="registries">
                            <Registries base={base} canMaintain={canMaintain} />
                        </ApiBoundary>
                    </MenuItem>
                    <MenuSubSection label="People" icon="users">
                        <MenuItem label="Members">
                            <ApiBoundary key="members">
                                <MembersSection base={base} canAdminister={canAdminister} />
                            </ApiBoundary>
                        </MenuItem>
                        <MenuItem label="Invitations">
                            <ApiBoundary key="invitations">
                                <InvitationsSection base={base} canMaintain={canMaintain} />
                            </ApiBoundary>
                        </MenuItem>
                    </MenuSubSection>
                    <MenuItem label="Solutions" icon="boxes">
                        <ApiBoundary key="solutions">
                            <SolutionsSection organization={membership.organization} canMaintain={canMaintain} />
                        </ApiBoundary>
                    </MenuItem>
                </MenuSection>
            </Menu>
        </Stack>
    );
}

/** Owns role-change confirmation only while the members section is active. */
function MembersSection({ base, canAdminister }: { base: string; canAdminister: boolean }) {
    const [member, setMember] = useState<{
        id: string;
        name: string;
        role: string;
    } | null>(null);

    // Load and invalidate People data only while the members section is active.
    const [{ members }, invalidateDetails] = useApi<z.output<typeof schemas.zOrganizationDetails>>(base);

    return (
        <>
            <Stack gap={4}>
                <Stack gap={1}>
                    <Heading level={2}>Members</Heading>
                    <Text color="secondary">Manage the people in this organization.</Text>
                </Stack>
                <Divider />
                <Table
                    data={members}
                    idKey={(row) => row.user.id}
                    hasHover
                    density="compact"
                    columns={[
                        {
                            key: 'user',
                            header: 'User',
                            width: proportional(1),
                            renderCell: (row) => (
                                <Stack direction="horizontal" gap={3} align="center">
                                    <Avatar name={row.user.name} src={row.user.avatar} />
                                    <Stack align="start">
                                        <Stack direction="horizontal" gap={1} align="center">
                                            <Text>{row.user.name}</Text>
                                            <Badge label={row.role} />
                                        </Stack>
                                        <Text type="supporting">{row.user.email}</Text>
                                    </Stack>
                                </Stack>
                            ),
                        },
                        ...(canAdminister
                            ? [
                                  {
                                      key: 'role',
                                      header: 'Actions',
                                      align: 'end' as const,
                                      width: proportional(0.5),
                                      renderCell: (row: z.output<typeof schemas.zOrganizationMemberAccessResponse>) => (
                                          <MoreMenu
                                              alignment="end"
                                              items={['read', 'write', 'maintain', 'admin'].flatMap((role) =>
                                                  role === row.role
                                                      ? []
                                                      : [
                                                            {
                                                                id: role,
                                                                label: `Set as ${role[0].toUpperCase() + role.slice(1)}`,
                                                                onClick: () =>
                                                                    setMember({
                                                                        id: row.user.id,
                                                                        name: row.user.name,
                                                                        role,
                                                                    }),
                                                            },
                                                        ]
                                              )}
                                          />
                                      ),
                                  },
                              ]
                            : []),
                    ]}
                />
            </Stack>
            {member && (
                <Dialog
                    isOpen
                    purpose="form"
                    onOpenChange={(open) => {
                        if (!open) setMember(null);
                    }}
                >
                    <DialogHeader title="Change role" onOpenChange={() => setMember(null)} />
                    <Stack gap={3}>
                        <Text color="secondary">
                            Change {member.name} to {member.role}?
                        </Text>
                        <Stack direction="horizontal" gap={2} justify="end">
                            <Button label="Cancel" variant="ghost" onClick={() => setMember(null)} />
                            <Button
                                label="Confirm"
                                variant="primary"
                                clickAction={async () => {
                                    // Update access on the server before refreshing the member list.
                                    await api.patch(`${base}/members/${member.id}`, {
                                        json: schemas.zOrganizationMemberUpdate.parse({
                                            role: member.role,
                                        }),
                                    });
                                    await invalidateDetails();
                                    setMember(null);
                                }}
                            />
                        </Stack>
                    </Stack>
                </Dialog>
            )}
        </>
    );
}

/** Owns invitation drafts and actions only while their section is active. */
function InvitationsSection({ base, canMaintain }: { base: string; canMaintain: boolean }) {
    const [invitation, setInvitation] = useState({ email: '', role: 'write' });
    const [inviting, setInviting] = useState(false);

    // Load and invalidate People data only while the invitations section is active.
    const [{ invitations }, invalidateDetails] = useApi<z.output<typeof schemas.zOrganizationDetails>>(base);

    /** Sends the validated invitation and refreshes organization access. */
    async function inviteMember() {
        // Refresh organization access only after sending the invitation succeeds.
        await api.post(`${base}/invitations`, {
            json: schemas.zOrganizationInvitationCreate.parse({
                ...invitation,
                email: invitation.email.trim(),
            }),
        });
        await invalidateDetails();
        setInviting(false);
    }

    return (
        <>
            <Stack gap={4}>
                <Stack direction="horizontal" justify="between" align="center" wrap="wrap">
                    <Stack gap={1}>
                        <Heading level={2}>Invitations</Heading>
                        <Text color="secondary">Send an invitation to join this organization.</Text>
                    </Stack>
                    {canMaintain && <Button label="Invite" onClick={() => setInviting(true)} />}
                </Stack>
                <Divider />
                <Table
                    data={invitations}
                    idKey="id"
                    hasHover
                    density="compact"
                    columns={[
                        { key: 'email', header: 'Email', width: proportional(1) },
                        {
                            key: 'role',
                            header: 'Role',
                            width: proportional(1),
                            renderCell: (row) => <Badge label={row.role} />,
                        },
                        ...(canMaintain
                            ? [
                                  {
                                      key: 'id',
                                      header: 'Actions',
                                      align: 'end' as const,
                                      width: proportional(0.5),
                                      renderCell: (row: z.output<typeof schemas.zOrganizationInvitationResponse>) => (
                                          <Button
                                              label="Revoke"
                                              variant="destructive"
                                              clickAction={async () => {
                                                  // Refresh organization access only after revocation succeeds.
                                                  await api.delete(`${base}/invitations/${row.id}`);
                                                  await invalidateDetails();
                                              }}
                                          />
                                      ),
                                  },
                              ]
                            : []),
                    ]}
                />
            </Stack>
            <Dialog isOpen={inviting} purpose="form" onOpenChange={setInviting}>
                <DialogHeader
                    title="Invite user"
                    subtitle="Send an invitation to join this organization."
                    onOpenChange={() => setInviting(false)}
                />
                <form action={inviteMember}>
                    <Stack gap={3}>
                        <TextInput
                            label="Email"
                            type="email"
                            value={invitation.email}
                            placeholder="user@example.com"
                            isRequired
                            onChange={(email) => setInvitation({ ...invitation, email })}
                        />
                        <Selector
                            label="Role"
                            value={invitation.role}
                            options={['read', 'write', 'maintain', 'admin'].map((value) => ({
                                value,
                                label: value,
                            }))}
                            onChange={(role) => setInvitation({ ...invitation, role })}
                        />
                        <Button label="Invite" variant="primary" type="submit" />
                    </Stack>
                </form>
            </Dialog>
        </>
    );
}

/** Loads storage usage only while the organization section is active. */
function StorageSection({ base }: { base: string }) {
    const [storage] = useApi<z.output<typeof schemas.zOrganizationStorageUsageResponse>>(`${base}/storage`);

    return (
        <Stack gap={4}>
            <Stack gap={1}>
                <Heading level={2}>Usage</Heading>
                <Text color="secondary">Review storage usage.</Text>
            </Stack>
            <Divider />
            <ProgressBar label="Storage" value={storage.space_used} max={storage.quota_bytes} />
        </Stack>
    );
}

/** Owns solution reads and dialogs for the lifetime of the active section. */
function SolutionsSection({
    organization,
    canMaintain,
}: {
    organization: z.output<typeof schemas.zUserOrganizationMembership>['organization'];
    canMaintain: boolean;
}) {
    const [creating, setCreating] = useState(false);
    const [update, setUpdate] = useState<Update | null>(null);
    const [deletion, setDeletion] = useState<{ id: string; name: string } | null>(null);
    const [logs, setLogs] = useState<string | null>(null);
    const [, startAction] = useTransition();
    const base = `/api/v1/organizations/${organization.id}`;

    // Keep solution refreshes scoped to the section's resource.
    const [solutions, invalidateSolutions] = useApi<
        z.output<typeof schemas.zGetOrganizationSolutionsApiV1OrganizationsOrganizationIdSolutionsGetResponse>
    >(`${base}/solutions`);

    return (
        <>
            <Stack gap={4}>
                <Stack direction="horizontal" justify="between" align="center" wrap="wrap">
                    <Heading level={1}>Solutions</Heading>
                    {canMaintain && <Button label="New Solution" onClick={() => setCreating(true)} />}
                </Stack>
                <Divider />
                <Table
                    data={solutions}
                    idKey="id"
                    hasHover
                    density="compact"
                    columns={[
                        {
                            key: 'name',
                            header: 'Solution',
                            width: proportional(1),
                            renderCell: (row) => (
                                <Stack>
                                    <Link href={`/orgs/${organization.slug}/solutions/${row.slug}`}>{row.name}</Link>
                                    {row.description && <Text type="supporting">{row.description}</Text>}
                                </Stack>
                            ),
                        },
                        ...(canMaintain
                            ? [
                                  {
                                      key: 'id',
                                      header: 'Actions',
                                      align: 'end' as const,
                                      width: proportional(0.5),
                                      renderCell: (row: Solution) => (
                                          <MoreMenu
                                              alignment="end"
                                              items={[
                                                  ...(row.desired_revision_id &&
                                                  !row.deployment_pending &&
                                                  row.status !== 'creating'
                                                      ? [
                                                            {
                                                                id: 'update',
                                                                label: 'Update',
                                                                icon: <RefreshCw />,
                                                                onClick: () => {
                                                                    // Forward async menu failures to the surrounding boundary without tracking pending state.
                                                                    startAction(async () => {
                                                                        // Fetch a fresh candidate for each review; never reuse a stale revision fence.
                                                                        const checked =
                                                                            schemas.zSolutionUpdateCheck.parse(
                                                                                await api(
                                                                                    `/api/v1/solutions/${row.id}/update`
                                                                                ).json()
                                                                            );

                                                                        setUpdate({
                                                                            key: crypto.randomUUID(),
                                                                            item: {
                                                                                id: row.id,
                                                                                name: row.name,
                                                                            },
                                                                            candidate: checked,
                                                                        });
                                                                    });
                                                                },
                                                            },
                                                        ]
                                                      : []),
                                                  {
                                                      id: 'logs',
                                                      label: 'Logs',
                                                      icon: <Logs />,
                                                      onClick: () => setLogs(row.id),
                                                  },
                                                  {
                                                      id: 'delete',
                                                      label: 'Delete',
                                                      icon: <Trash />,
                                                      onClick: () =>
                                                          setDeletion({
                                                              id: row.id,
                                                              name: row.name,
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
            </Stack>
            {creating && (
                <CreateSolution
                    organizationId={organization.id}
                    invalidate={invalidateSolutions}
                    onClose={() => setCreating(false)}
                />
            )}
            {update && (
                <DeploymentReview
                    key={update.key}
                    update={update}
                    invalidate={invalidateSolutions}
                    onClose={() => setUpdate(null)}
                />
            )}
            {logs && (
                <Dialog
                    aria-label="Pod logs"
                    isOpen
                    purpose="info"
                    width={960}
                    maxHeight="calc(100dvh - var(--spacing-10) * 4)"
                    padding={0}
                    onOpenChange={(open) => {
                        if (!open) setLogs(null);
                    }}
                >
                    <Stack height="min(560px, calc(100dvh - var(--spacing-10) * 4))" paddingInline={8} paddingBlock={4}>
                        <ApiBoundary key={logs}>
                            <SolutionLogs solutionId={logs} onClose={() => setLogs(null)} />
                        </ApiBoundary>
                    </Stack>
                </Dialog>
            )}
            <DeletionDialog
                confirmation={
                    deletion
                        ? {
                              title: 'Delete solution',
                              description: `Delete solution ${deletion.name}?`,
                              onDelete: async () => {
                                  // Refresh Solutions only after the delete request succeeds.
                                  await api.delete(`/api/v1/solutions/${deletion.id}`);
                                  await invalidateSolutions();
                                  setDeletion(null);
                              },
                          }
                        : null
                }
                onClose={() => setDeletion(null)}
            />
        </>
    );
}

/** Loads pod logs only while their dialog is open. */
function SolutionLogs({ solutionId, onClose }: { solutionId: string; onClose: () => void }) {
    const [logs, invalidate] = useApi<z.output<typeof schemas.zGetSolutionLogsApiV1SolutionsSolutionIdLogsGetResponse>>(
        `/api/v1/solutions/${solutionId}/logs`
    );

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
