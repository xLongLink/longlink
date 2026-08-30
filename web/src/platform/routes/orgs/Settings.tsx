import { api } from '@/lib/api';
import { useState } from 'react';
import Logs from '@/components/dialogs/Logs';
import { Stack } from '@/components/ui/Stack';
import { useDeleteDialog } from '@/lib/utils';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/lib/hooks/use-toast';
import { Badge } from '@astryxdesign/core/Badge';
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
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { avatarUrlSchema } from '@/components/settings/validation';
import CreateApplication from '@/components/dialogs/CreateApplication';
import { DeleteConfirmation } from '@/components/dialogs/DeleteConfirmation';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { Menu, MenuItem, MenuSection, MenuSubSection } from '@/components/ui/Menu';
import {
    zGetOrganizationDatabaseUsageApiV1OrganizationsOrganizationIdDatabaseGetResponse,
    zOrganizationStorageUsageResponse,
} from '@/lib/generated/platform-api-v1/zod.gen';
import {
    useDeleteOrganizationApplication,
    useOrganization,
    useOrganizationApplications,
    useOrganizationMembers,
    useUpdateOrganization,
} from '@/lib/hooks/use-organization';
import type {
    OrganizationApplicationSummary,
    OrganizationInvitationResponse,
    OrganizationMemberAccessResponse,
    OrganizationRoles,
} from '@/lib/generated/platform-api-v1/types.gen';

/** Renders the organization settings page. */
export default function OrganizationSettings() {
    const { organization = '' } = useParams();
    const { hash } = useLocation();
    const toast = useToast();
    const isApplicationsSectionActive = hash === '#applications';
    const {
        organization: organizationDetails,
        members,
        invitations,
        role: organizationRole,
        isLoading: isOrganizationLoading,
        error: organizationError,
    } = useOrganization(organization);
    const {
        applications,
        isLoading: isApplicationsLoading,
        error: applicationsError,
    } = useOrganizationApplications(organization, isApplicationsSectionActive);
    const isLoading = isOrganizationLoading || isApplicationsLoading;
    const error = organizationError ?? applicationsError;
    const organizationName = organizationDetails?.name ?? organization;
    const organizationAvatar = organizationDetails?.avatar ?? '';
    const organizationId = organizationDetails?.id ?? '';
    const canManageOrganization = hasMinimumRole(organizationRole, 'admin');
    const hasOrganizationApplicationAccess = hasMinimumRole(organizationRole, 'maintain');
    const [logsTarget, setLogsTarget] = useState<OrganizationApplicationSummary | null>(null);
    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<OrganizationRoles>('write');
    const [roleChangeTarget, setRoleChangeTarget] = useState<{
        member: OrganizationMemberAccessResponse;
        role: OrganizationRoles;
    } | null>(null);
    const [revokeInvitationTarget, setRevokeInvitationTarget] = useState<OrganizationInvitationResponse | null>(null);
    const [editedAvatar, setEditedAvatar] = useState<string | null>(null);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
    const deleteApplication = useDeleteOrganizationApplication(organizationId);
    const { inviteMember, revokeInvitation, changeMemberRole } = useOrganizationMembers(organizationId);
    const updateOrganization = useUpdateOrganization(organizationId);
    const deleteDialog = useDeleteDialog({
        title: 'Delete application',
        mutation: deleteApplication,
        items: applications,
        getId: (application) => application.id,
        description: (application) => `Delete ${application.name} from this organization?`,
        errorMessage: 'Failed to delete application',
        fallbackDescription: 'Delete this application?',
        onError: (message) => toast({ body: message, type: 'error' }),
    });
    const isOrganizationSectionActive = hash === '' || hash === '#organization';
    const avatar = editedAvatar ?? organizationAvatar;
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

        // Persist the URL and keep the response available while Organization data refreshes.
        try {
            const updated = await updateOrganization.mutateAsync({ avatar: normalizedAvatar });
            setEditedAvatar(updated.avatar);
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
            <Stack className="pt-1" direction="horizontal" gap={3} align="center">
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
                                <Stack>
                                    <Heading level={2}>Members</Heading>
                                </Stack>
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
                                                            onClick: () => setRoleChangeTarget({ member, role }),
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
                                    <Stack>
                                        <Heading level={2}>Invitations</Heading>
                                    </Stack>
                                    <Button
                                        label="Invite"
                                        isDisabled={organizationId.length === 0 || !hasOrganizationApplicationAccess}
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
                                        {hasOrganizationApplicationAccess ? (
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
                                                                onClick: () => setRevokeInvitationTarget(invitation),
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
                    <MenuItem icon="boxes" label="Applications">
                        <Stack gap={4}>
                            <Stack direction="horizontal" gap={4} justify="between" align="end" wrap="wrap">
                                <Heading level={2}>Applications</Heading>
                                {hasOrganizationApplicationAccess ? (
                                    <CreateApplication organizationId={organizationId} />
                                ) : null}
                            </Stack>
                            <Divider />

                            {isLoading && applications.length === 0 ? null : error && applications.length === 0 ? (
                                <Banner status="error" title="Failed to load applications." />
                            ) : (
                                <Table
                                    data={applications}
                                    density="compact"
                                    emptyState={<EmptyState title="No applications found." isCompact />}
                                    hasHover
                                    idKey="id"
                                >
                                    <TableColumn<OrganizationApplicationSummary>
                                        field="name"
                                        header="Application"
                                        width={proportional(1)}
                                    >
                                        {(application) => (
                                            <Stack>
                                                <Stack direction="horizontal" gap={1} align="center">
                                                    <Link
                                                        href={`/orgs/${organization}/apps/${application.slug}`}
                                                        weight="semibold"
                                                    >
                                                        {application.name}
                                                    </Link>
                                                    <StatusBadge status={application.status} />
                                                </Stack>
                                                {application.description ? (
                                                    <Text type="supporting">{application.description}</Text>
                                                ) : null}
                                            </Stack>
                                        )}
                                    </TableColumn>
                                    {hasOrganizationApplicationAccess ? (
                                        <TableColumn<OrganizationApplicationSummary>
                                            align="end"
                                            field="action"
                                            header="Action"
                                            width={pixel(96)}
                                        >
                                            {(application) => (
                                                <MoreMenu
                                                    label={`Open actions for ${application.name}`}
                                                    size="sm"
                                                    items={[
                                                        { label: 'Logs', onClick: () => setLogsTarget(application) },
                                                        {
                                                            label: 'Delete',
                                                            onClick: () => deleteDialog.openFor(application),
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
                    applicationId={logsTarget.id}
                    applicationName={logsTarget.name}
                    onOpenChange={(open) => !open && setLogsTarget(null)}
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
                    roleChangeTarget
                        ? `Grant ${roleLabel(roleChangeTarget.role)} permission to ${roleChangeTarget.member.user.name} in this organization?`
                        : 'Change this member role?'
                }
                cancelLabel="Cancel"
                actionLabel="Change role"
                actionVariant="primary"
                isActionLoading={changeMemberRole.isPending}
                onAction={async () => {
                    // Ignore submissions without a selected role change.
                    if (roleChangeTarget === null) {
                        return;
                    }

                    // Persist the selected organization role.
                    try {
                        await changeMemberRole.mutateAsync({
                            memberId: roleChangeTarget.member.user.id,
                            role: roleChangeTarget.role,
                        });
                        toast({
                            body: `${roleChangeTarget.member.user.name} now has ${roleLabel(roleChangeTarget.role)} permission`,
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
                isOpen={revokeInvitationTarget !== null}
                onOpenChange={(nextOpen) => {
                    // Keep the selected invitation only while its confirmation is open.
                    if (!nextOpen) {
                        setRevokeInvitationTarget(null);
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
                        setRevokeInvitationTarget(null);
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
                                                inviteEmail.trim().length === 0 || !hasOrganizationApplicationAccess
                                            }
                                        />
                                    </Stack>
                                </Stack>
                            </form>
                        </LayoutContent>
                    }
                />
            </Dialog>
            <Dialog isOpen={isAvatarDialogOpen} purpose="form" onOpenChange={handleAvatarOpenChange}>
                <Layout
                    header={
                        <DialogHeader
                            title="Organization avatar"
                            subtitle="Use an HTTP(S) image URL."
                            onOpenChange={handleAvatarOpenChange}
                        />
                    }
                    content={
                        <LayoutContent>
                            <form
                                id="organization-avatar-form"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    void saveAvatar();
                                }}
                            >
                                <TextInput
                                    label="Avatar URL"
                                    value={avatar}
                                    width="100%"
                                    isOptional
                                    isDisabled={updateOrganization.isPending}
                                    placeholder="https://example.com/org.png"
                                    status={avatarError ? { type: 'error', message: avatarError } : undefined}
                                    onChange={(value) => {
                                        setEditedAvatar(value);
                                        setAvatarError(null);
                                    }}
                                />
                            </form>
                        </LayoutContent>
                    }
                    footer={
                        <LayoutFooter>
                            <Stack direction="horizontal" gap={2} justify="end">
                                <Button
                                    label="Cancel"
                                    variant="ghost"
                                    isDisabled={updateOrganization.isPending}
                                    onClick={() => handleAvatarOpenChange(false)}
                                />
                                <Button
                                    form="organization-avatar-form"
                                    type="submit"
                                    label="Save"
                                    variant="primary"
                                    isLoading={updateOrganization.isPending}
                                />
                            </Stack>
                        </LayoutFooter>
                    }
                />
            </Dialog>
            <DeleteConfirmation {...deleteDialog.dialogProps} />
        </PageContainer>
    );
}
