import type { z } from 'zod';
import { api } from '@/lib/api';
import { NoIndex } from '@/components/Seo';
import { useApi } from '@/lib/hooks/use-api';
import CreateSolution from './CreateSolution';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { useState, useTransition } from 'react';
import { Badge } from '@astryxdesign/core/Badge';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { RefreshCw, Logs, Trash } from 'lucide-react';
import { ApiBoundary } from '@/components/ApiBoundary';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Selector } from '@astryxdesign/core/Selector';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { TextInput } from '@astryxdesign/core/TextInput';
import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { Table, proportional } from '@astryxdesign/core/Table';
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

/** Owns the deployment draft and submission for a freshly checked candidate. */
function DeploymentReview({ update, invalidate, onClose }: DeploymentReviewProps) {
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

    /** Submits the reviewed deployment while preserving untouched secrets. */
    async function updateSolution() {
        if (missingRequired || !hasChanges) return;

        // Send edited secrets and explicit removals, preserving omitted values.
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

/** Manages organization access, storage, and deployments; the layout owns route-scoped resets. */
export default function OrganizationSettings() {
    const [invitation, setInvitation] = useState({ email: '', role: 'write' });
    const [inviting, setInviting] = useState(false);
    const [member, setMember] = useState<{ id: string; name: string; role: string } | null>(null);
    const [creating, setCreating] = useState(false);
    const [update, setUpdate] = useState<Update | null>(null);
    const [deletion, setDeletion] = useState<{ id: string; name: string } | null>(null);
    const [logs, setLogs] = useState<string | null>(null);
    const [, startAction] = useTransition();
    const [isDeleting, startDeletion] = useTransition();
    const membership = useResolvedOrganizationMembership();
    const base = `/api/v1/organizations/${membership.organization.id}`;

    // Keep each required resource paired with its own scoped invalidator.
    const [details, invalidateDetails] = useApi<z.output<typeof schemas.zOrganizationDetails>>(base);
    const [storage] = useApi<z.output<typeof schemas.zOrganizationStorageUsageResponse>>(`${base}/storage`);
    const [solutions, invalidateSolutions] = useApi<
        z.output<typeof schemas.zGetOrganizationSolutionsApiV1OrganizationsOrganizationIdSolutionsGetResponse>
    >(`${base}/solutions`);

    const canMaintain = ['maintain', 'admin', 'owner'].includes(membership.role);
    const canAdminister = ['admin', 'owner'].includes(membership.role);

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
            <Menu>
                <MenuSection title="Settings" isHeaderHidden>
                    <MenuItem label="Organization" icon="building2">
                        <Stack gap={4}>
                            <Stack gap={1}>
                                <Heading level={2}>Organization</Heading>
                                <Text color="secondary">Review storage usage.</Text>
                            </Stack>
                            <Divider />
                            <ProgressBar label="Storage" value={storage.space_used} max={storage.quota_bytes} />
                        </Stack>
                    </MenuItem>
                    <MenuSubSection label="People" icon="users">
                        <MenuItem label="Members">
                            <Stack gap={4}>
                                <Stack gap={1}>
                                    <Heading level={2}>Members</Heading>
                                    <Text color="secondary">Manage the people in this organization.</Text>
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
                                                      renderCell: (
                                                          row: z.output<
                                                              typeof schemas.zOrganizationMemberAccessResponse
                                                          >
                                                      ) => (
                                                          <MoreMenu
                                                              alignment="end"
                                                              items={['read', 'write', 'maintain', 'admin']
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
                        </MenuItem>
                        <MenuItem label="Invitations">
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
                                                          row: z.output<typeof schemas.zOrganizationInvitationResponse>
                                                      ) => (
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
                        </MenuItem>
                    </MenuSubSection>
                    <MenuItem label="Solutions" icon="boxes">
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
                                                <Link
                                                    href={`/orgs/${membership.organization.slug}/solutions/${row.slug}`}
                                                >
                                                    {row.name}
                                                </Link>
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
                    </MenuItem>
                </MenuSection>
            </Menu>
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
                            options={['read', 'write', 'maintain', 'admin'].map((value) => ({ value, label: value }))}
                            onChange={(role) => setInvitation({ ...invitation, role })}
                        />
                        <Button label="Invite" variant="primary" type="submit" />
                    </Stack>
                </form>
            </Dialog>
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
                                        json: schemas.zOrganizationMemberUpdate.parse({ role: member.role }),
                                    });
                                    await invalidateDetails();
                                    setMember(null);
                                }}
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
                <AlertDialog
                    isOpen
                    title="Delete solution"
                    description={`Delete solution ${deletion.name}?`}
                    actionLabel="Delete"
                    isActionLoading={isDeleting}
                    onOpenChange={(open) => {
                        if (!open) setDeletion(null);
                    }}
                    onAction={() =>
                        startDeletion(async () => {
                            // Refresh Solutions only after the delete request succeeds.
                            await api.delete(`/api/v1/solutions/${deletion.id}`);
                            await invalidateSolutions();
                            setDeletion(null);
                        })
                    }
                />
            )}
        </Stack>
    );
}

/** Loads pod logs only while their dialog is open. */
function SolutionLogs({ solutionId }: { solutionId: string }) {
    const [logs, invalidate] = useApi<z.output<typeof schemas.zGetSolutionLogsApiV1SolutionsSolutionIdLogsGetResponse>>(
        `/api/v1/solutions/${solutionId}/logs`
    );
    return (
        <Stack gap={3}>
            <Button label="Refresh logs" clickAction={invalidate} />
            <CodeBlock code={logs.join('\n')} hasLineNumbers isWrapped size="sm" />
        </Stack>
    );
}
