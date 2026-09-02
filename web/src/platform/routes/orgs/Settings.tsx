import { api } from '@/lib/api';
import { useState } from 'react';
import Logs from '@/components/dialogs/Logs';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/lib/hooks/use-toast';
import { Badge } from '@astryxdesign/core/Badge';
import { Stack } from '@astryxdesign/core/Stack';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { useLocation, useParams } from 'react-router';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Selector } from '@astryxdesign/core/Selector';
import { hasMinimumRole, ROLE_NAMES } from '@/lib/roles';
import { dateFormatter, formatBytes } from '@/lib/utils';
import { TextInput } from '@astryxdesign/core/TextInput';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AvatarDialog } from '@/components/dialogs/Avatar';
import NotFoundLayout from '@/components/layouts/NotFound';
import { PageContainer } from '@/components/PageContainer';
import { Table, TableColumn } from '@/components/ui/Table';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { IconButton } from '@astryxdesign/core/IconButton';
import { skipToken, useQuery } from '@tanstack/react-query';
import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { pixel, proportional } from '@astryxdesign/core/Table';
import CreateSolution from '@/components/dialogs/CreateSolution';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import { avatarUrlSchema } from '@/components/settings/validation';
import { Menu, MenuItem, MenuSection, MenuSubSection } from '@/components/ui/Menu';
import { DeleteConfirmation, useDeleteDialog } from '@/components/dialogs/DeleteConfirmation';
import {
    zGetOrganizationDatabaseUsageApiV1OrganizationsOrganizationIdDatabaseGetResponse,
    zOrganizationStorageUsageResponse,
} from '@/lib/generated/platform-api-v1/zod.gen';
import {
    useDeleteOrganizationSolution,
    useOrganization,
    useOrganizationSolutions,
    useOrganizationMembers,
    useUpdateOrganization,
} from '@/lib/hooks/use-organization';
import type {
    OrganizationSolutionSummary,
    OrganizationInvitationResponse,
    OrganizationMemberAccessResponse,
    OrganizationRoles,
} from '@/lib/generated/platform-api-v1/types.gen';

/** Renders the organization settings page. */
export default function OrganizationSettings() {
    const { organization = '' } = useParams();
    const { hash } = useLocation();
    const toast = useToast();
    const isSolutionsSectionActive = hash === '#solutions';
    const {
        organization: organizationDetails,
        members,
        invitations,
        role: organizationRole,
        isLoading: isOrganizationLoading,
        error: organizationError,
    } = useOrganization(organization);
    const {
        solutions,
        isLoading: isSolutionsLoading,
        error: solutionsError,
    } = useOrganizationSolutions(organization, isSolutionsSectionActive);
    const isLoading = isOrganizationLoading || isSolutionsLoading;
    const error = organizationError ?? solutionsError;
    const organizationName = organizationDetails?.name ?? organization;
    const organizationAvatar = organizationDetails?.avatar ?? '';
    const organizationId = organizationDetails?.id ?? '';
    const canManageOrganization = hasMinimumRole(organizationRole, 'admin');
    const hasOrganizationSolutionAccess = hasMinimumRole(organizationRole, 'maintain');
    const [logsTargetId, setLogsTargetId] = useState<string | null>(null);
    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<OrganizationRoles>('write');
    const [roleChangeTarget, setRoleChangeTarget] = useState<{
        memberId: string;
        role: OrganizationRoles;
    } | null>(null);
    const [revokeInvitationId, setRevokeInvitationId] = useState<string | null>(null);
    const [editedAvatar, setEditedAvatar] = useState<string | null>(null);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
    const deleteSolution = useDeleteOrganizationSolution(organizationId);
    const { inviteMember, revokeInvitation, changeMemberRole } = useOrganizationMembers(organizationId);
    const updateOrganization = useUpdateOrganization(organizationId);
    const deleteDialog = useDeleteDialog({
        title: 'Delete solution',
        mutation: deleteSolution,
        items: solutions,
        getId: (solution) => solution.id,
        description: (solution) => `Delete ${solution.name} from this organization?`,
        errorMessage: 'Failed to delete solution',
        fallbackDescription: 'Delete this solution?',
        onError: (message) => toast({ body: message, type: 'error' }),
    });
    const isOrganizationSectionActive = hash === '' || hash === '#organization';
    const avatar = editedAvatar ?? organizationAvatar;
    const logsTarget = solutions.find((solution) => solution.id === logsTargetId) ?? null;
    const roleChangeMember =
        roleChangeTarget === null
            ? null
            : (members.find((member) => member.user.id === roleChangeTarget.memberId) ?? null);
    const revokeInvitationTarget = invitations.find((invitation) => invitation.id === revokeInvitationId) ?? null;
    const databasePath =
        isOrganizationSectionActive && organizationId ? `/api/v1/organizations/${organizationId}/database` : null;
    const {
        data: databaseUsage,
        error: databaseError,
        isLoading: isDatabaseLoading,
    } = useQuery({
        queryKey: ['api', databasePath],
        queryFn:
            databasePath === null
                ? skipToken
                : async ({ signal }) =>
                      zGetOrganizationDatabaseUsageApiV1OrganizationsOrganizationIdDatabaseGetResponse.parse(
                          await api(databasePath, { signal }).json()
                      ),
        retry: false,
    });

    /** Returns the user-facing label for an organization role. */
    function roleLabel(role: OrganizationRoles) {
        return role === 'maintain' ? 'maintainer' : role;
    }

    /** Saves the current avatar URL and closes the dialog on success. */
    async function saveAvatar() {
        setAvatarError(null);

        // Ignore unavailable, unauthorized, and unchanged Organizations.
        if (!canManageOrganization) {
            return;
        }
        const normalizedAvatar = avatar.trim();
        if (normalizedAvatar === organizationAvatar) {
            setIsAvatarDialogOpen(false);
            return;
        }

        // Require an empty value or an HTTP(S) URL.
        if (!avatarUrlSchema.safeParse(normalizedAvatar).success) {
            setAvatarError('Enter a valid HTTP(S) avatar URL.');
            return;
        }

        // Persist the URL and use the refreshed Organization value.
        try {
            await updateOrganization.mutateAsync({ avatar: normalizedAvatar });
            setEditedAvatar(null);
            setIsAvatarDialogOpen(false);
            toast({ body: 'Avatar saved' });
        } catch (mutationError) {
            toast({
                body: mutationError instanceof Error ? mutationError.message : 'Failed to update avatar',
                type: 'error',
            });
        }
    }

    /** Opens or closes the avatar editor without retaining canceled changes. */
    function handleAvatarOpenChange(isOpen: boolean) {
        // Keep the dialog available while a submitted avatar URL is still saving.
        if (updateOrganization.isPending) {
            return;
        }

        setIsAvatarDialogOpen(isOpen);

        // Discard the dialog's draft when the user closes it without saving.
        if (!isOpen) {
            setEditedAvatar(null);
            setAvatarError(null);
        }
    }
    const storagePath =
        isOrganizationSectionActive && organizationId ? `/api/v1/organizations/${organizationId}/storage` : null;
    const {
        data: storageUsage,
        error: storageError,
        isLoading: isStorageLoading,
    } = useQuery({
        queryKey: ['api', storagePath],
        queryFn:
            storagePath === null
                ? skipToken
                : async ({ signal }) =>
                      zOrganizationStorageUsageResponse.nullable().parse(await api(storagePath, { signal }).json()),
        retry: false,
    });
    // Hide missing or inaccessible orgs behind the shared 404 page.
    if (error?.status === 404) {
        return <NotFoundLayout />;
    }

    return (
        <PageContainer gap={8} padding={2}>
            <Stack paddingBlockStart={1} direction="horizontal" gap={3} align="center">
                <IconButton
                    className="size-12"
                    icon={<Avatar kind="organization" name={organizationName} size="lg" src={avatar} />}
                    isDisabled={!canManageOrganization}
                    label="Edit organization avatar"
                    tooltip="Edit avatar"
                    variant="ghost"
                    onClick={() => {
                        setEditedAvatar(organizationAvatar);
                        setAvatarError(null);
                        setIsAvatarDialogOpen(true);
                    }}
                />
                <Stack>
                    <Heading accessibilityLevel={1} level={4}>
                        {organizationName}
                    </Heading>
                    <Text size="sm" type="supporting">
                        Organization
                    </Text>
                </Stack>
            </Stack>
            <Menu>
                <MenuSection title="Settings" isHeaderHidden>
                    <MenuItem icon="building2" label="Organization">
                        <Stack gap={3}>
                            <Heading level={2}>Organization</Heading>
                            <Divider />
                            <ProgressBar
                                formatValueLabel={(value) =>
                                    databaseError ? 'Unavailable' : `${formatBytes(value)} used`
                                }
                                hasValueLabel
                                isDisabled={databaseError !== null}
                                isIndeterminate={isDatabaseLoading}
                                label="Database"
                                max={Math.max(databaseUsage ?? 0, 1)}
                                value={databaseUsage ?? 0}
                                variant="neutral"
                            />
                            <ProgressBar
                                formatValueLabel={(value) =>
                                    storageError ? 'Unavailable' : `${formatBytes(value)} used`
                                }
                                hasValueLabel
                                isDisabled={storageError !== null}
                                isIndeterminate={isStorageLoading}
                                label="Storage"
                                max={Math.max(storageUsage?.space_used ?? 0, 1)}
                                value={storageUsage?.space_used ?? 0}
                                variant="neutral"
                            />
                        </Stack>
                    </MenuItem>
                    <MenuSubSection icon="users" label="People">
                        <MenuItem label="Members">
                            <Stack gap={4}>
                                <Heading level={2}>Members</Heading>
                                <Divider />
                                {isLoading && members.length === 0 ? null : error && members.length === 0 ? (
                                    <Banner status="error" title="Failed to load people." />
                                ) : (
                                    <Table
                                        data={members}
                                        density="compact"
                                        emptyState={<EmptyState title="No people found." isCompact />}
                                        hasHover
                                        idKey={(member) => member.user.id}
                                    >
                                        <TableColumn<OrganizationMemberAccessResponse>
                                            field="member"
                                            header="User"
                                            width={proportional(1)}
                                        >
                                            {(member) => (
                                                <Stack direction="horizontal" gap={3} align="center">
                                                    <Avatar src={member.user.avatar} name={member.user.name} />
                                                    <Stack>
                                                        <Text weight="semibold">{member.user.name}</Text>
                                                        <Text type="supporting">{member.user.email}</Text>
                                                    </Stack>
                                                </Stack>
                                            )}
                                        </TableColumn>
                                        <TableColumn<OrganizationMemberAccessResponse>
                                            field="membership"
                                            header="Role"
                                            width={pixel(128)}
                                        >
                                            {(member) => <Badge label={member.role} />}
                                        </TableColumn>
                                        <TableColumn<OrganizationMemberAccessResponse>
                                            align="end"
                                            field="actions"
                                            header="Action"
                                            width={pixel(96)}
                                        >
                                            {(member) => (
                                                <MoreMenu
                                                    label={`Open actions for ${member.user.name}`}
                                                    size="sm"
                                                    isDisabled={!canManageOrganization}
                                                    items={ROLE_NAMES.filter((role) => role !== member.role).map(
                                                        (role) => ({
                                                            label: `Grant ${roleLabel(role)} permission`,
                                                            onClick: () =>
                                                                setRoleChangeTarget({ memberId: member.user.id, role }),
                                                        })
                                                    )}
                                                />
                                            )}
                                        </TableColumn>
                                    </Table>
                                )}
                            </Stack>
                        </MenuItem>
                        <MenuItem label="Invitations">
                            <Stack gap={4}>
                                <Stack direction="horizontal" gap={4} justify="between" align="end" wrap="wrap">
                                    <Heading level={2}>Invitations</Heading>
                                    <Button
                                        label="Invite"
                                        isDisabled={organizationId.length === 0 || !hasOrganizationSolutionAccess}
                                        onClick={() => setInviteOpen(true)}
                                    />
                                </Stack>
                                <Divider />
                                {isLoading && invitations.length === 0 ? null : error && invitations.length === 0 ? (
                                    <Banner status="error" title="Failed to load invitations." />
                                ) : (
                                    <Table
                                        data={invitations}
                                        density="compact"
                                        emptyState={<EmptyState title="No invitations yet." isCompact />}
                                        hasHover
                                        idKey="id"
                                    >
                                        <TableColumn<OrganizationInvitationResponse>
                                            field="email"
                                            header="Email"
                                            width={proportional(1)}
                                        >
                                            {(invitation) => <Text weight="semibold">{invitation.email}</Text>}
                                        </TableColumn>
                                        <TableColumn<OrganizationInvitationResponse>
                                            field="role"
                                            header="Role"
                                            width={pixel(128)}
                                        >
                                            {(invitation) => invitation.role}
                                        </TableColumn>
                                        <TableColumn<OrganizationInvitationResponse>
                                            field="created_at"
                                            header="Created"
                                            width={pixel(144)}
                                        >
                                            {(invitation) => dateFormatter.format(new Date(invitation.created_at))}
                                        </TableColumn>
                                        {hasOrganizationSolutionAccess ? (
                                            <TableColumn<OrganizationInvitationResponse>
                                                align="end"
                                                field="actions"
                                                header="Action"
                                                width={pixel(96)}
                                            >
                                                {(invitation) => (
                                                    <MoreMenu
                                                        label={`Open actions for ${invitation.email}`}
                                                        size="sm"
                                                        isDisabled={!hasMinimumRole(organizationRole, invitation.role)}
                                                        items={[
                                                            {
                                                                label: 'Revoke',
                                                                onClick: () => setRevokeInvitationId(invitation.id),
                                                            },
                                                        ]}
                                                    />
                                                )}
                                            </TableColumn>
                                        ) : null}
                                    </Table>
                                )}
                            </Stack>
                        </MenuItem>
                    </MenuSubSection>
                    <MenuItem icon="boxes" label="Solutions">
                        <Stack gap={4}>
                            <Stack direction="horizontal" gap={4} justify="between" align="end" wrap="wrap">
                                <Heading level={2}>Solutions</Heading>
                                {hasOrganizationSolutionAccess ? (
                                    <CreateSolution organizationId={organizationId} />
                                ) : null}
                            </Stack>
                            <Divider />

                            {isLoading && solutions.length === 0 ? null : error && solutions.length === 0 ? (
                                <Banner status="error" title="Failed to load solutions." />
                            ) : (
                                <Table
                                    data={solutions}
                                    density="compact"
                                    emptyState={<EmptyState title="No solutions found." isCompact />}
                                    hasHover
                                    idKey="id"
                                >
                                    <TableColumn<OrganizationSolutionSummary>
                                        field="name"
                                        header="Solution"
                                        width={proportional(1)}
                                    >
                                        {(solution) => (
                                            <Stack>
                                                <Stack direction="horizontal" gap={1} align="center">
                                                    <Link
                                                        href={`/orgs/${organization}/solutions/${solution.slug}`}
                                                        weight="semibold"
                                                    >
                                                        {solution.name}
                                                    </Link>
                                                    <StatusBadge status={solution.status} />
                                                </Stack>
                                                {solution.description ? (
                                                    <Text type="supporting">{solution.description}</Text>
                                                ) : null}
                                            </Stack>
                                        )}
                                    </TableColumn>
                                    {hasOrganizationSolutionAccess ? (
                                        <TableColumn<OrganizationSolutionSummary>
                                            align="end"
                                            field="action"
                                            header="Action"
                                            width={pixel(96)}
                                        >
                                            {(solution) => (
                                                <MoreMenu
                                                    label={`Open actions for ${solution.name}`}
                                                    size="sm"
                                                    items={[
                                                        {
                                                            label: 'Logs',
                                                            onClick: () => setLogsTargetId(solution.id),
                                                        },
                                                        {
                                                            label: 'Delete',
                                                            onClick: () => deleteDialog.openFor(solution),
                                                        },
                                                    ]}
                                                />
                                            )}
                                        </TableColumn>
                                    ) : null}
                                </Table>
                            )}
                        </Stack>
                    </MenuItem>
                </MenuSection>
            </Menu>
            {logsTarget ? (
                <Logs
                    kind="solution"
                    onOpenChange={(open) => !open && setLogsTargetId(null)}
                    resourceId={logsTarget.id}
                />
            ) : null}
            <AlertDialog
                isOpen={roleChangeTarget !== null}
                onOpenChange={(nextOpen) => {
                    // Reset pending role changes when the dialog closes.
                    if (!nextOpen) {
                        setRoleChangeTarget(null);
                    }
                }}
                title="Change member role"
                description={
                    roleChangeTarget && roleChangeMember
                        ? `Grant ${roleLabel(roleChangeTarget.role)} permission to ${roleChangeMember.user.name} in this organization?`
                        : 'Change this member role?'
                }
                cancelLabel="Cancel"
                actionLabel="Change role"
                actionVariant="primary"
                isActionLoading={changeMemberRole.isPending}
                onAction={async () => {
                    // Ignore submissions without a selected role change.
                    if (roleChangeTarget === null || roleChangeMember === null) {
                        return;
                    }

                    // Persist the selected organization role.
                    try {
                        await changeMemberRole.mutateAsync({
                            memberId: roleChangeTarget.memberId,
                            role: roleChangeTarget.role,
                        });
                        toast({
                            body: `${roleChangeMember.user.name} now has ${roleLabel(roleChangeTarget.role)} permission`,
                        });
                        setRoleChangeTarget(null);
                    } catch (mutationError) {
                        toast({
                            body:
                                mutationError instanceof Error ? mutationError.message : 'Failed to change member role',
                            type: 'error',
                        });
                    }
                }}
            />
            <AlertDialog
                isOpen={revokeInvitationId !== null}
                onOpenChange={(nextOpen) => {
                    // Keep the selected invitation only while its confirmation is open.
                    if (!nextOpen) {
                        setRevokeInvitationId(null);
                    }
                }}
                title="Revoke invitation"
                description={
                    revokeInvitationTarget
                        ? `Revoke the pending invitation for ${revokeInvitationTarget.email}?`
                        : 'Revoke this pending invitation?'
                }
                cancelLabel="Cancel"
                actionLabel="Revoke invitation"
                actionVariant="destructive"
                isActionLoading={revokeInvitation.isPending}
                onAction={async () => {
                    // Ignore submissions without a selected invitation.
                    if (revokeInvitationTarget === null) {
                        return;
                    }

                    // Revoke the pending grant and refresh Organization details.
                    try {
                        await revokeInvitation.mutateAsync(revokeInvitationTarget.id);
                        toast({ body: `Invitation for ${revokeInvitationTarget.email} revoked` });
                        setRevokeInvitationId(null);
                    } catch (mutationError) {
                        toast({
                            body:
                                mutationError instanceof Error ? mutationError.message : 'Failed to revoke invitation',
                            type: 'error',
                        });
                    }
                }}
            />
            <Dialog isOpen={inviteOpen} purpose="form" onOpenChange={setInviteOpen}>
                <Layout
                    height="auto"
                    header={
                        <DialogHeader
                            title="Invite user"
                            subtitle="Send an invitation to join this organization."
                            onOpenChange={setInviteOpen}
                        />
                    }
                    content={
                        <LayoutContent isScrollable={false}>
                            <form
                                id="invite-member-form"
                                onSubmit={async (event) => {
                                    event.preventDefault();

                                    // Submit the invitation and surface any failure.
                                    try {
                                        await inviteMember.mutateAsync({ email: inviteEmail.trim(), role: inviteRole });
                                        setInviteOpen(false);
                                        setInviteEmail('');
                                        setInviteRole('write');
                                    } catch (mutationError) {
                                        toast({
                                            body:
                                                mutationError instanceof Error
                                                    ? mutationError.message
                                                    : 'Failed to invite user',
                                            type: 'error',
                                        });
                                    }
                                }}
                            >
                                <Stack gap={4}>
                                    <FormLayout>
                                        <TextInput
                                            label="Email"
                                            type="email"
                                            value={inviteEmail}
                                            placeholder="user@example.com"
                                            onChange={setInviteEmail}
                                            isRequired
                                        />
                                        <Selector
                                            isRequired
                                            label="Role"
                                            options={ROLE_NAMES}
                                            value={inviteRole}
                                            onChange={(value) => setInviteRole(value as OrganizationRoles)}
                                        />
                                    </FormLayout>
                                    <Stack direction="horizontal" gap={2} justify="end" wrap="wrap">
                                        <Button label="Cancel" onClick={() => setInviteOpen(false)} />
                                        <Button
                                            label={inviteMember.isPending ? 'Inviting...' : 'Invite'}
                                            type="submit"
                                            isLoading={inviteMember.isPending}
                                            isDisabled={
                                                inviteEmail.trim().length === 0 || !hasOrganizationSolutionAccess
                                            }
                                        />
                                    </Stack>
                                </Stack>
                            </form>
                        </LayoutContent>
                    }
                />
            </Dialog>
            <AvatarDialog
                avatar={avatar}
                error={avatarError}
                formId="organization-avatar-form"
                isOpen={isAvatarDialogOpen}
                isSaving={updateOrganization.isPending}
                onAvatarChange={(value) => {
                    setEditedAvatar(value);
                    setAvatarError(null);
                }}
                onOpenChange={handleAvatarOpenChange}
                onSave={saveAvatar}
                placeholder="https://example.com/org.png"
                title="Organization avatar"
            />
            <DeleteConfirmation {...deleteDialog.dialogProps} />
        </PageContainer>
    );
}
