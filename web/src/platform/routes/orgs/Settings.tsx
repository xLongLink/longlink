import type { z } from 'zod';
import { api } from '@/lib/api';
import { useState } from 'react';
import { NoIndex } from '@/components/Seo';
import { Menu } from '@/components/ui/Menu';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@astryxdesign/core/Badge';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { RefreshCw, Logs, Trash } from 'lucide-react';
import { ApiBoundary } from '@/components/ApiBoundary';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Selector } from '@astryxdesign/core/Selector';
import { useApi, useAction } from '@/lib/hooks/use-api';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { TextInput } from '@astryxdesign/core/TextInput';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { Table, proportional } from '@astryxdesign/core/Table';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import CreateSolution from '@/platform/views/orgs/CreateSolution';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { useResolvedOrganizationMembership } from '@/lib/hooks/use-organization';

type Solution = z.output<typeof schemas.zOrganizationSolutionSummary>;
type Update = {
    // Remount drafts for every fresh check, including checks of the same revision.
    key: string;
    item: { id: string; name: string };
    candidate: z.output<typeof schemas.zSolutionUpdateCheck>;
};
type DeploymentReviewProps = {
    update: Update;
    action: ReturnType<typeof useAction>;
    invalidate: () => Promise<void>;
    onClose: () => void;
};

/** Owns the deployment draft and submission for a freshly checked candidate. */
function DeploymentReview({ update, action, invalidate, onClose }: DeploymentReviewProps) {
    const [envs, setEnvs] = useState<Record<string, string>>({});
    const [removed, setRemoved] = useState<Record<string, boolean>>({});

    // Preserve configured required secrets, and require values for new required environments.
    const missingRequired = (update.candidate.metadata.environments ?? []).some(
        (environment) =>
            environment.required &&
            (removed[environment.name] === true ||
                (!update.candidate.configured_envs.includes(environment.name) &&
                    (!Object.hasOwn(envs, environment.name) || !envs[environment.name].trim())))
    );
    const hasChanges =
        update.candidate.metadata.image !== update.candidate.current_image ||
        Object.keys(envs).length > 0 ||
        Object.values(removed).some(Boolean);

    return (
        <Dialog
            isOpen
            purpose="form"
            onOpenChange={(open) => {
                if (!open && !action.isPending) onClose();
            }}
        >
            <DialogHeader
                title={`Update ${update.item.name}`}
                onOpenChange={() => {
                    if (!action.isPending) onClose();
                }}
            />
            <Stack
                gap={3}
                as="form"
                onSubmit={(event) => {
                    event.preventDefault();
                    if (action.isPending || missingRequired || !hasChanges) return;

                    // Send edited secrets and explicit removals, preserving all omitted values.
                    action.mutate(async () => {
                        const patchEnvs = {
                            ...envs,
                            ...Object.fromEntries(
                                Object.entries(removed)
                                    .filter(([, removed]) => removed)
                                    .map(([name]) => [name, null])
                            ),
                        };
                        await api.post(`/api/v1/solutions/${update.item.id}/update`, {
                            json: schemas.zSolutionPatch.parse({
                                envs: patchEnvs,
                                expected_revision_id: update.candidate.revision_id,
                            }),
                        });
                        await invalidate();
                        onClose();
                    });
                }}
            >
                <Stack direction="horizontal" gap={2} align="center" wrap="wrap">
                    <Text type="supporting" color="secondary">
                        Current {update.candidate.current_image_digest}
                    </Text>
                    <Text type="supporting" color="primary">
                        New {update.candidate.image_digest}
                    </Text>
                </Stack>
                {(update.candidate.metadata.environments ?? []).map((environment) => {
                    const configured = update.candidate.configured_envs.includes(environment.name);
                    const isRemoved = removed[environment.name] === true;

                    // Configured secrets remain hidden; blank untouched inputs preserve them.
                    return (
                        <Stack key={environment.name} gap={2}>
                            <TextInput
                                label={environment.name}
                                labelTooltip={environment.description ?? undefined}
                                type="password"
                                value={Object.hasOwn(envs, environment.name) ? envs[environment.name] : ''}
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
                                onChange={(value) => setEnvs({ ...envs, [environment.name]: value })}
                            />
                            {configured && !environment.required && (
                                <CheckboxInput
                                    label={`Remove ${environment.name}`}
                                    value={isRemoved}
                                    onChange={(value) => setRemoved({ ...removed, [environment.name]: value })}
                                />
                            )}
                        </Stack>
                    );
                })}
                <Stack direction="horizontal" gap={2} justify="end" wrap="wrap">
                    <Button
                        label="Cancel"
                        variant="ghost"
                        isDisabled={action.isPending}
                        onClick={() => {
                            if (!action.isPending) onClose();
                        }}
                    />
                    <Button
                        label="Update solution"
                        variant="primary"
                        type="submit"
                        isDisabled={missingRequired || !hasChanges}
                        isLoading={action.isPending}
                    />
                </Stack>
            </Stack>
        </Dialog>
    );
}

/** Manages organization access, storage, and deployments; the layout owns route-scoped resets. */
export default function OrganizationSettings() {
    const [invitation, setInvitation] = useState({ email: '', role: 'write' });
    const [inviting, setInviting] = useState(false);
    const [member, setMember] = useState<{ id: string; name: string; role: string } | null>(null);
    const [creating, setCreating] = useState(false);
    const [update, setUpdate] = useState<Update | null>(null);
    const [deletion, setDeletion] = useState<{ id: string; name: string } | null>(null);
    const [logs, setLogs] = useState<string | null>(null);
    const action = useAction();
    const membership = useResolvedOrganizationMembership();
    const base = `/api/v1/organizations/${membership.organization.id}`;

    // Keep each required resource paired with its own scoped invalidator.
    const [details, invalidateDetails] = useApi(base, schemas.zOrganizationDetails);
    const [storage] = useApi(`${base}/storage`, schemas.zOrganizationStorageUsageResponse);
    const [solutions, invalidateSolutions] = useApi(
        `${base}/solutions`,
        schemas.zGetOrganizationSolutionsApiV1OrganizationsOrganizationIdSolutionsGetResponse
    );

    const canMaintain = ['maintain', 'admin', 'owner'].includes(membership.role);
    const canAdminister = ['admin', 'owner'].includes(membership.role);

    return (
        <Stack gap={8}>
            <NoIndex title="Organization Settings | LongLink" />
            <Stack direction="horizontal" gap={3} align="center">
                <Avatar shape="rounded" name={details.organization.name} />
                <Stack gap={0}>
                    <Heading level={4} accessibilityLevel={1}>
                        {details.organization.name}
                    </Heading>
                    <Text type="supporting">Organization</Text>
                </Stack>
            </Stack>
            <Menu
                sections={[
                    {
                        title: 'Settings',
                        isHeaderHidden: true,
                        entries: [
                            {
                                kind: 'item',
                                id: 'organization',
                                label: 'Organization',
                                icon: 'building2',
                                content: (
                                    <Stack gap={4}>
                                        <Stack gap={1}>
                                            <Heading level={2}>Organization</Heading>
                                            <Text color="secondary">Review storage usage.</Text>
                                        </Stack>
                                        <Divider />
                                        <ProgressBar
                                            label="Storage"
                                            value={storage.space_used}
                                            max={storage.quota_bytes}
                                        />
                                    </Stack>
                                ),
                            },
                            {
                                kind: 'subsection',
                                label: 'People',
                                icon: 'users',
                                items: [
                                    {
                                        kind: 'item',
                                        id: 'members',
                                        label: 'Members',
                                        content: (
                                            <Stack gap={4}>
                                                <Stack gap={1}>
                                                    <Heading level={2}>Members</Heading>
                                                    <Text color="secondary">
                                                        Manage the people in this organization.
                                                    </Text>
                                                </Stack>
                                                <Divider />
                                                <Table
                                                    data={details.members}
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
                                                                    <Avatar
                                                                        name={row.user.name}
                                                                        src={row.user.avatar}
                                                                    />
                                                                    <Stack align="start">
                                                                        <Stack
                                                                            direction="horizontal"
                                                                            gap={1}
                                                                            align="center"
                                                                        >
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
                                                                      renderCell: (
                                                                          row: z.output<
                                                                              typeof schemas.zOrganizationMemberAccessResponse
                                                                          >
                                                                      ) => (
                                                                          <MoreMenu
                                                                              alignment="end"
                                                                              items={[
                                                                                  'read',
                                                                                  'write',
                                                                                  'maintain',
                                                                                  'admin',
                                                                              ]
                                                                                  .filter((role) => role !== row.role)
                                                                                  .map((role) => ({
                                                                                      id: role,
                                                                                      label: `Set as ${role[0].toUpperCase() + role.slice(1)}`,
                                                                                      onClick: () =>
                                                                                          setMember({
                                                                                              id: row.user.id,
                                                                                              name: row.user.name,
                                                                                              role,
                                                                                          }),
                                                                                  }))}
                                                                          />
                                                                      ),
                                                                  },
                                                              ]
                                                            : []),
                                                    ]}
                                                />
                                            </Stack>
                                        ),
                                    },
                                    {
                                        kind: 'item',
                                        id: 'invitations',
                                        label: 'Invitations',
                                        content: (
                                            <Stack gap={4}>
                                                <Stack
                                                    direction="horizontal"
                                                    justify="between"
                                                    align="center"
                                                    wrap="wrap"
                                                >
                                                    <Stack gap={1}>
                                                        <Heading level={2}>Invitations</Heading>
                                                        <Text color="secondary">
                                                            Send an invitation to join this organization.
                                                        </Text>
                                                    </Stack>
                                                    {canMaintain && (
                                                        <Button label="Invite" onClick={() => setInviting(true)} />
                                                    )}
                                                </Stack>
                                                <Divider />
                                                <Table
                                                    data={details.invitations}
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
                                                                      renderCell: (
                                                                          row: z.output<
                                                                              typeof schemas.zOrganizationInvitationResponse
                                                                          >
                                                                      ) => (
                                                                          <Button
                                                                              label="Revoke"
                                                                              variant="destructive"
                                                                              isDisabled={action.isPending}
                                                                              onClick={() =>
                                                                                  action.mutate(async () => {
                                                                                      // Refresh organization access only after revocation succeeds.
                                                                                      await api.delete(
                                                                                          `${base}/invitations/${row.id}`
                                                                                      );
                                                                                      await invalidateDetails();
                                                                                  })
                                                                              }
                                                                          />
                                                                      ),
                                                                  },
                                                              ]
                                                            : []),
                                                    ]}
                                                />
                                            </Stack>
                                        ),
                                    },
                                ],
                            },
                            {
                                kind: 'item',
                                id: 'solutions',
                                label: 'Solutions',
                                icon: 'boxes',
                                content: (
                                    <Stack gap={4}>
                                        <Stack direction="horizontal" justify="between" align="center" wrap="wrap">
                                            <Heading level={1}>Solutions</Heading>
                                            {canMaintain && (
                                                <Button label="New Solution" onClick={() => setCreating(true)} />
                                            )}
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
                                                            <Link
                                                                href={`/orgs/${membership.organization.slug}/solutions/${row.slug}`}
                                                            >
                                                                {row.name}
                                                            </Link>
                                                            {row.description && (
                                                                <Text type="supporting">{row.description}</Text>
                                                            )}
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
                                                                      isDisabled={action.isPending}
                                                                      items={[
                                                                          ...(row.desired_revision_id &&
                                                                          !row.deployment_pending &&
                                                                          row.status !== 'creating'
                                                                              ? [
                                                                                    {
                                                                                        id: 'update',
                                                                                        label: 'Update',
                                                                                        icon: <RefreshCw />,
                                                                                        onClick: () =>
                                                                                            action.mutate(async () => {
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
                                                                                            }),
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
                                ),
                            },
                        ],
                    },
                ]}
            />
            <Dialog
                isOpen={inviting}
                purpose="form"
                onOpenChange={(open) => {
                    if (!action.isPending) setInviting(open);
                }}
            >
                <DialogHeader
                    title="Invite user"
                    subtitle="Send an invitation to join this organization."
                    onOpenChange={() => {
                        if (!action.isPending) setInviting(false);
                    }}
                />
                <Stack
                    gap={3}
                    as="form"
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (action.isPending) return;

                        // Validate the invitation and preserve the draft if sending fails.
                        action.mutate(async () => {
                            await api.post(`${base}/invitations`, {
                                json: schemas.zOrganizationInvitationCreate.parse({
                                    ...invitation,
                                    email: invitation.email.trim(),
                                }),
                            });
                            await invalidateDetails();
                            setInviting(false);
                        });
                    }}
                >
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
                        options={['read', 'write', 'maintain', 'admin'].map((value) => ({ value, label: value }))}
                        onChange={(role) => setInvitation({ ...invitation, role })}
                    />
                    <Button label="Invite" variant="primary" type="submit" isLoading={action.isPending} />
                </Stack>
            </Dialog>
            {member && (
                <Dialog
                    isOpen
                    purpose="form"
                    onOpenChange={(open) => {
                        if (!open && !action.isPending) setMember(null);
                    }}
                >
                    <DialogHeader
                        title="Change role"
                        onOpenChange={() => {
                            if (!action.isPending) setMember(null);
                        }}
                    />
                    <Stack gap={3}>
                        <Text color="secondary">
                            Change {member.name} to {member.role}?
                        </Text>
                        <Stack direction="horizontal" gap={2} justify="end">
                            <Button
                                label="Cancel"
                                variant="ghost"
                                isDisabled={action.isPending}
                                onClick={() => setMember(null)}
                            />
                            <Button
                                label="Confirm"
                                variant="primary"
                                isLoading={action.isPending}
                                onClick={() =>
                                    action.mutate(async () => {
                                        // Update access on the server before refreshing the member list.
                                        await api.patch(`${base}/members/${member.id}`, {
                                            json: schemas.zOrganizationMemberUpdate.parse({ role: member.role }),
                                        });
                                        await invalidateDetails();
                                        setMember(null);
                                    })
                                }
                            />
                        </Stack>
                    </Stack>
                </Dialog>
            )}
            {creating && (
                <CreateSolution
                    organizationId={membership.organization.id}
                    invalidate={invalidateSolutions}
                    onClose={() => setCreating(false)}
                />
            )}
            {update && (
                <DeploymentReview
                    key={update.key}
                    update={update}
                    action={action}
                    invalidate={invalidateSolutions}
                    onClose={() => setUpdate(null)}
                />
            )}
            {logs && (
                <Dialog
                    isOpen
                    onOpenChange={(open) => {
                        if (!open) setLogs(null);
                    }}
                >
                    <DialogHeader title="Pod logs" onOpenChange={() => setLogs(null)} />
                    <ApiBoundary key={logs}>
                        <SolutionLogs solutionId={logs} />
                    </ApiBoundary>
                </Dialog>
            )}
            {deletion && (
                <Dialog
                    isOpen
                    purpose="form"
                    onOpenChange={(open) => {
                        if (!open && !action.isPending) setDeletion(null);
                    }}
                >
                    <DialogHeader
                        title="Delete solution"
                        onOpenChange={() => {
                            if (!action.isPending) setDeletion(null);
                        }}
                    />
                    <Stack gap={3}>
                        <Text color="secondary">Delete solution {deletion.name}?</Text>
                        <Stack direction="horizontal" gap={2} justify="end">
                            <Button
                                label="Cancel"
                                variant="ghost"
                                isDisabled={action.isPending}
                                onClick={() => setDeletion(null)}
                            />
                            <Button
                                label="Delete"
                                variant="destructive"
                                isLoading={action.isPending}
                                onClick={() =>
                                    action.mutate(async () => {
                                        // Refresh Solutions only after the delete request succeeds.
                                        await api.delete(`/api/v1/solutions/${deletion.id}`);
                                        await invalidateSolutions();
                                        setDeletion(null);
                                    })
                                }
                            />
                        </Stack>
                    </Stack>
                </Dialog>
            )}
        </Stack>
    );
}

/** Loads pod logs only while their dialog is open. */
function SolutionLogs({ solutionId }: { solutionId: string }) {
    const [logs, invalidate] = useApi(
        `/api/v1/solutions/${solutionId}/logs`,
        schemas.zGetSolutionLogsApiV1SolutionsSolutionIdLogsGetResponse
    );
    return (
        <Stack gap={3}>
            <Button label="Refresh logs" clickAction={invalidate} />
            <CodeBlock code={logs.join('\n')} hasLineNumbers isWrapped size="sm" />
        </Stack>
    );
}
