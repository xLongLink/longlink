import { api } from '@/lib/api';
import { useState } from 'react';
import { useParams } from 'react-router';
import { NoIndex } from '@/components/Seo';
import { Menu } from '@/components/ui/Menu';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@astryxdesign/core/Badge';
import { Stack } from '@astryxdesign/core/Stack';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { Spinner } from '@astryxdesign/core/Spinner';
import { RefreshCw, Logs, Trash } from 'lucide-react';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Selector } from '@astryxdesign/core/Selector';
import { useQueryClient } from '@tanstack/react-query';
import { useApi, useAction } from '@/lib/hooks/use-api';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { TextInput } from '@astryxdesign/core/TextInput';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { Table, proportional } from '@astryxdesign/core/Table';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import CreateSolution from '@/platform/views/orgs/CreateSolution';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { useOrganizationMembership } from '@/lib/hooks/use-organization';

/** @typedef {import('zod').output<typeof schemas.zOrganizationSolutionSummary>} Solution */
/** @typedef {{ item: Solution, candidate: import('zod').output<typeof schemas.zSolutionUpdateCheck>, envs: Record<string, string>, removed: Record<string, boolean> }} Update */

/** Presents a deployment review while the parent owns the draft and submission.
 * @param {{ update: Update, isPending: boolean, isDisabled: boolean, onClose: () => void, onSubmit: import('react').SubmitEventHandler<HTMLElement>, onEnvironmentChange: (name: string, value: string) => void, onRemovalChange: (name: string, value: boolean) => void }} props
 */
function DeploymentReview({ update, isPending, isDisabled, onClose, onSubmit, onEnvironmentChange, onRemovalChange }) {
    return (
        <Dialog
            isOpen
            purpose="form"
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogHeader title={`Update ${update.item.name}`} onOpenChange={onClose} />
            <Stack gap={3} as="form" onSubmit={onSubmit}>
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
                    const removed = update.removed[environment.name] === true;

                    // Configured secrets remain hidden; blank untouched inputs preserve them.
                    return (
                        <Stack key={environment.name} gap={2}>
                            <TextInput
                                label={environment.name}
                                labelTooltip={environment.description ?? undefined}
                                type="password"
                                value={
                                    Object.hasOwn(update.envs, environment.name) ? update.envs[environment.name] : ''
                                }
                                isDisabled={removed}
                                isOptional={!environment.required}
                                isRequired={environment.required && (!configured || removed)}
                                placeholder={
                                    removed
                                        ? 'Will be removed'
                                        : configured
                                          ? 'Configured: preserve existing value'
                                          : environment.description || 'Enter value'
                                }
                                onChange={(value) => onEnvironmentChange(environment.name, value)}
                            />
                            {configured && !environment.required && (
                                <CheckboxInput
                                    label={`Remove ${environment.name}`}
                                    value={removed}
                                    onChange={(value) => onRemovalChange(environment.name, value)}
                                />
                            )}
                        </Stack>
                    );
                })}
                <Stack direction="horizontal" gap={2} justify="end" wrap="wrap">
                    <Button label="Cancel" variant="ghost" isDisabled={isPending} onClick={onClose} />
                    <Button
                        label="Update solution"
                        variant="primary"
                        type="submit"
                        isDisabled={isDisabled}
                        isLoading={isPending}
                    />
                </Stack>
            </Stack>
        </Dialog>
    );
}

/** Renders organization metadata and resets drafts when the route identity changes. */
export default function OrganizationSettings() {
    const { organization = '' } = useParams();

    return (
        <>
            <NoIndex title="Organization Settings | LongLink" />
            <SettingsPage key={organization} organization={organization} />
        </>
    );
}

/** Manages organization access, storage, and Solution deployment operations.
 * @param {{ organization: string }} props
 */
function SettingsPage({ organization }) {
    const [invitation, setInvitation] = useState({ email: '', role: 'write' });
    const [inviting, setInviting] = useState(false);
    const [member, setMember] = useState(
        /** @type {{ item: import('zod').output<typeof schemas.zOrganizationMemberAccessResponse>, role: string } | null} */ (
            null
        )
    );
    const [creating, setCreating] = useState(false);
    const [update, setUpdate] = useState(/** @type {Update | null} */ (null));
    const [deletion, setDeletion] = useState(/** @type {Solution | null} */ (null));
    const [logs, setLogs] = useState(/** @type {Solution | null} */ (null));
    const client = useQueryClient();
    const action = useAction();
    const membership = useOrganizationMembership(organization);
    const organizationId = membership.data?.organization.id;
    const base = organizationId ? `/api/v1/organizations/${organizationId}` : null;
    const details = useApi(base, schemas.zOrganizationDetails);
    const storage = useApi(base ? `${base}/storage` : null, schemas.zOrganizationStorageUsageResponse);
    const solutions = useApi(
        base ? `${base}/solutions` : null,
        schemas.zGetOrganizationSolutionsApiV1OrganizationsOrganizationIdSolutionsGetResponse
    );
    const solutionLogs = useApi(
        logs ? `/api/v1/solutions/${logs.id}/logs` : null,
        schemas.zGetSolutionLogsApiV1SolutionsSolutionIdLogsGetResponse
    );

    // Resolve membership first; the remaining organization reads can run independently.
    if (membership.error || details.error || storage.error || solutions.error)
        return <Banner status="error" title="Unable to load organization settings" />;
    if (!membership.data || !details.data || !storage.data || !solutions.data)
        return <Spinner label="Loading organization settings" />;

    const canMaintain = ['maintain', 'admin', 'owner'].includes(membership.data.role);
    const canAdminister = ['admin', 'owner'].includes(membership.data.role);

    // Preserve configured required secrets, and require values for new required environments.
    const missingRequired =
        update &&
        (update.candidate.metadata.environments ?? []).some(
            (environment) =>
                environment.required &&
                (update.removed[environment.name] === true ||
                    (!update.candidate.configured_envs.includes(environment.name) &&
                        (!Object.hasOwn(update.envs, environment.name) || !update.envs[environment.name].trim())))
        );
    const hasChanges =
        update &&
        (update.candidate.metadata.image !== update.candidate.current_image ||
            Object.keys(update.envs).length > 0 ||
            Object.values(update.removed).some(Boolean));

    return (
        <Stack gap={8}>
            <Stack direction="horizontal" gap={3} align="center">
                <Avatar shape="rounded" name={details.data.organization.name} />
                <Stack gap={0}>
                    <Heading level={4} accessibilityLevel={1}>
                        {details.data.organization.name}
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
                                            value={storage.data.space_used}
                                            max={storage.data.quota_bytes}
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
                                                    data={details.data.members}
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
                                                                      align: /** @type {const} */ ('end'),
                                                                      width: proportional(0.5),
                                                                      renderCell: (
                                                                          /** @type {import('zod').output<typeof schemas.zOrganizationMemberAccessResponse>} */ row
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
                                                                                              item: row,
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
                                                    data={details.data.invitations}
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
                                                                      align: /** @type {const} */ ('end'),
                                                                      width: proportional(0.5),
                                                                      renderCell: (
                                                                          /** @type {import('zod').output<typeof schemas.zOrganizationInvitationResponse>} */ row
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
                                                                                      await client.invalidateQueries({
                                                                                          queryKey: ['api', base],
                                                                                          exact: true,
                                                                                      });
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
                                            data={solutions.data}
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
                                                            <Link href={`/orgs/${organization}/solutions/${row.slug}`}>
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
                                                              align: /** @type {const} */ ('end'),
                                                              width: proportional(0.5),
                                                              renderCell: (/** @type {Solution} */ row) => (
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
                                                                                                    item: row,
                                                                                                    candidate: checked,
                                                                                                    envs: {},
                                                                                                    removed: {},
                                                                                                });
                                                                                            }),
                                                                                    },
                                                                                ]
                                                                              : []),
                                                                          {
                                                                              id: 'logs',
                                                                              label: 'Logs',
                                                                              icon: <Logs />,
                                                                              onClick: () => setLogs(row),
                                                                          },
                                                                          {
                                                                              id: 'delete',
                                                                              label: 'Delete',
                                                                              icon: <Trash />,
                                                                              onClick: () => setDeletion(row),
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
                            await client.invalidateQueries({ queryKey: ['api', base], exact: true });
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
                            Change {member.item.user.name} to {member.role}?
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
                                        await api.patch(`${base}/members/${member.item.user.id}`, {
                                            json: schemas.zOrganizationMemberUpdate.parse({ role: member.role }),
                                        });
                                        await client.invalidateQueries({ queryKey: ['api', base], exact: true });
                                        setMember(null);
                                    })
                                }
                            />
                        </Stack>
                    </Stack>
                </Dialog>
            )}
            {creating && (
                <CreateSolution organizationId={membership.data.organization.id} onClose={() => setCreating(false)} />
            )}
            {update && (
                <DeploymentReview
                    update={update}
                    isPending={action.isPending}
                    isDisabled={Boolean(missingRequired || !hasChanges)}
                    onClose={() => {
                        if (!action.isPending) setUpdate(null);
                    }}
                    onEnvironmentChange={(name, value) =>
                        setUpdate({ ...update, envs: { ...update.envs, [name]: value } })
                    }
                    onRemovalChange={(name, value) =>
                        setUpdate({ ...update, removed: { ...update.removed, [name]: value } })
                    }
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (action.isPending || missingRequired || !hasChanges) return;

                        // Send edited secrets and explicit removals, preserving all omitted values.
                        action.mutate(async () => {
                            const envs = {
                                ...update.envs,
                                ...Object.fromEntries(
                                    Object.entries(update.removed)
                                        .filter(([, removed]) => removed)
                                        .map(([name]) => [name, null])
                                ),
                            };
                            await api.post(`/api/v1/solutions/${update.item.id}/update`, {
                                json: schemas.zSolutionPatch.parse({
                                    envs,
                                    expected_revision_id: update.candidate.revision_id,
                                }),
                            });
                            await client.invalidateQueries({ queryKey: ['api', `${base}/solutions`], exact: true });
                            setUpdate(null);
                        });
                    }}
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
                    <Stack gap={3}>
                        <Button
                            label="Refresh logs"
                            isLoading={solutionLogs.isFetching}
                            onClick={() => void solutionLogs.refetch()}
                        />
                        {solutionLogs.error ? (
                            <Banner status="error" title="Unable to load logs" />
                        ) : !solutionLogs.data ? (
                            <Spinner label="Loading logs" />
                        ) : (
                            <CodeBlock code={solutionLogs.data.join('\n')} hasLineNumbers isWrapped size="sm" />
                        )}
                    </Stack>
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
                                        await client.invalidateQueries({
                                            queryKey: ['api', `${base}/solutions`],
                                            exact: true,
                                        });
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
