import { api } from '@/lib/api';
import { useState } from 'react';
import { NoIndex } from '@/components/Seo';
import Logs from '@/components/dialogs/Logs';
import { UserCell } from '@/components/Cells';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Dialog } from '@/components/ui/Dialog';
import { useToast } from '@/lib/hooks/use-toast';
import { Badge } from '@astryxdesign/core/Badge';
import { Stack } from '@astryxdesign/core/Stack';
import { Token } from '@astryxdesign/core/Token';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useParams } from 'react-router';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Selector } from '@astryxdesign/core/Selector';
import SolutionUpdate from '@/components/SolutionUpdate';
import { hasMinimumRole, ROLE_NAMES } from '@/lib/roles';
import { dateFormatter, formatBytes } from '@/lib/utils';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Timestamp } from '@astryxdesign/core/Timestamp';
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
import DatabaseSettings from '@/components/settings/Database';
import { pixel, proportional } from '@astryxdesign/core/Table';
import { Controller, useForm, useWatch } from 'react-hook-form';
import CreateSolution from '@/components/dialogs/CreateSolution';
import { invitationSchema } from '@/components/settings/validation';
import { Menu, MenuItem, MenuSection, MenuSubSection } from '@/components/ui/Menu';
import { DeleteConfirmation, useDeleteDialog } from '@/components/dialogs/DeleteConfirmation';
import {
    useDeleteOrganizationSolution,
    useOrganization,
    useOrganizationSolutions,
    useOrganizationMembers,
    useUpdateOrganization,
} from '@/lib/hooks/use-organization';
import {
    zGetOrganizationDatabaseUsageApiV1OrganizationsOrganizationIdDatabaseGetResponse,
    zGetOrganizationStorageUsageApiV1OrganizationsOrganizationIdStorageGetResponse,
} from '@/lib/generated/platform-api-v1/zod.gen';
import type {
    OrganizationInvitationCreate,
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
    const invitationForm = useForm<OrganizationInvitationCreate>({
        defaultValues: { email: '', role: 'write' },
        resolver: zodResolver(invitationSchema),
    });
    const inviteEmail = useWatch({ control: invitationForm.control, name: 'email' });
    const [roleChangeTarget, setRoleChangeTarget] = useState<{
        memberId: string;
        role: OrganizationRoles;
    } | null>(null);
    const [revokeInvitationId, setRevokeInvitationId] = useState<string | null>(null);
    const deleteSolution = useDeleteOrganizationSolution(organizationId);
    const { inviteMember, revokeInvitation, changeMemberRole } = useOrganizationMembers(organizationId);
    const updateOrganization = useUpdateOrganization(organizationId);
    const deleteDialog = useDeleteDialog({
        title: 'Delete solution',
        mutation: deleteSolution,
        items: solutions,
        getId: (solution) => solution.id,
        description: (solution) => `Delete ${solution.name} from this organization?`,
        fallbackDescription: 'Delete this solution?',
    });
    const isOrganizationSectionActive = hash === '' || hash === '#organization';
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
                      zGetOrganizationStorageUsageApiV1OrganizationsOrganizationIdStorageGetResponse.parse(
                          await api(storagePath, { signal }).json()
                      ),
        retry: false,
    });
    // Hide missing or inaccessible orgs behind the shared 404 page.
    if (error?.status === 404) {
        return <NotFoundLayout />;
    }

    return (
        <PageContainer gap={8} padding={2}>
            <NoIndex title="Organization Settings | LongLink" />
            <Stack paddingBlockStart={1} direction="horizontal" gap={3} align="center">
                <AvatarDialog
                    key={organizationId}
                    avatar={organizationAvatar}
                    formId="organization-avatar-form"
                    isSaving={updateOrganization.isPending}
                    isDisabled={!canManageOrganization || organizationId.length === 0}
                    onSave={(avatar) =>
                        updateOrganization.mutateAsync(
                            { avatar },
                            {
                                onSuccess: () => toast({ body: 'Avatar saved' }),
                            }
                        )
                    }
                    placeholder="https://example.com/org.png"
                    title="Organization avatar"
                >
                    {(avatar, open) => (
                        <IconButton
                            className="size-12"
                            icon={<Avatar kind="organization" name={organizationName} size="lg" src={avatar} />}
                            isDisabled={!canManageOrganization}
                            label="Edit organization avatar"
                            tooltip="Edit avatar"
                            variant="ghost"
                            onClick={open}
                        />
                    )}
                </AvatarDialog>
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
                                    databaseError
                                        ? 'Unavailable'
                                        : databaseUsage?.size_bytes == null
                                          ? 'Not measured'
                                          : `${formatBytes(value)} used`
                                }
                                hasValueLabel
                                isDisabled={databaseError !== null}
                                isIndeterminate={isDatabaseLoading}
                                label="Database"
                                max={databaseUsage?.allocated_bytes ?? 1}
                                value={databaseUsage?.size_bytes ?? 0}
                                variant="neutral"
                            />
                            <Stack direction="horizontal" gap={2} align="center" wrap="wrap">
                                {organizationDetails && (
                                    <Token
                                        label={organizationDetails.database_state}
                                        description="Database state"
                                        size="sm"
                                        color={organizationDetails.database_state === 'failed' ? 'red' : 'default'}
                                    />
                                )}
                                {databaseUsage && (
                                    <Text type="supporting">
                                        {formatBytes(databaseUsage.allocated_bytes)} allocated per database instance
                                    </Text>
                                )}
                            </Stack>
                            <Text type="supporting">
                                {databaseUsage?.measured_at == null ? (
                                    'No cached database measurement.'
                                ) : (
                                    <>
                                        Last measured{' '}
                                        <Timestamp
                                            value={databaseUsage.measured_at}
                                            format="date_time"
                                            isTimezoneShown
                                        />
                                        . Cached while the database is asleep.
                                    </>
                                )}
                            </Text>
                            {organizationDetails && (
                                <DatabaseSettings
                                    key={organizationId}
                                    organization={organizationDetails}
                                    canManage={canManageOrganization}
                                />
                            )}
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
                                            {(member) => <UserCell user={member.user} />}
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
                                                                setRoleChangeTarget({
                                                                    memberId: member.user.id,
                                                                    role,
                                                                }),
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
                                                    {solution.deployment_pending && solution.status !== 'creating' ? (
                                                        <Text type="supporting">Deployment queued</Text>
                                                    ) : null}
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
                                            width={pixel(224)}
                                        >
                                            {(solution) => (
                                                <Stack
                                                    direction="horizontal"
                                                    gap={2}
                                                    align="center"
                                                    justify="end"
                                                    wrap="wrap"
                                                >
                                                    <SolutionUpdate
                                                        key={`${solution.id}:${solution.desired_revision_id}:${solution.deployment_pending}:${solution.status}`}
                                                        solution={solution}
                                                        organizationId={organizationId}
                                                    />
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
                                                </Stack>
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
                onAction={() => {
                    // Ignore submissions without a selected role change.
                    if (roleChangeTarget === null || roleChangeMember === null) {
                        return;
                    }

                    // Persist the selected organization role.
                    changeMemberRole.mutate(
                        {
                            memberId: roleChangeTarget.memberId,
                            role: roleChangeTarget.role,
                        },
                        {
                            onSuccess: () => {
                                toast({
                                    body: `${roleChangeMember.user.name} now has ${roleLabel(roleChangeTarget.role)} permission`,
                                });
                                setRoleChangeTarget(null);
                            },
                        }
                    );
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
                onAction={() => {
                    // Ignore submissions without a selected invitation.
                    if (revokeInvitationTarget === null) {
                        return;
                    }

                    // Revoke the pending grant and refresh Organization details.
                    revokeInvitation.mutate(revokeInvitationTarget.id, {
                        onSuccess: () => {
                            toast({ body: `Invitation for ${revokeInvitationTarget.email} revoked` });
                            setRevokeInvitationId(null);
                        },
                    });
                }}
            />
            <Dialog
                isOpen={inviteOpen}
                purpose="form"
                subtitle="Send an invitation to join this organization."
                title="Invite user"
                onOpenChange={setInviteOpen}
            >
                <form
                    id="invite-member-form"
                    noValidate
                    onSubmit={invitationForm.handleSubmit((values) => {
                        if (inviteMember.isPending || organizationId.length === 0 || !hasOrganizationSolutionAccess) {
                            return;
                        }

                        // Reset the invitation form after a successful submission.
                        inviteMember.mutate(values, {
                            onSuccess: () => {
                                setInviteOpen(false);
                                invitationForm.reset();
                            },
                        });
                    })}
                >
                    <Stack gap={4}>
                        <FormLayout>
                            <Controller
                                control={invitationForm.control}
                                name="email"
                                render={({ field, fieldState }) => (
                                    <TextInput
                                        label="Email"
                                        type="email"
                                        ref={field.ref}
                                        htmlName={field.name}
                                        value={field.value}
                                        placeholder="user@example.com"
                                        onChange={(value) => field.onChange(value)}
                                        onBlur={field.onBlur}
                                        status={
                                            fieldState.error
                                                ? { type: 'error', message: fieldState.error.message }
                                                : undefined
                                        }
                                        isRequired
                                    />
                                )}
                            />
                            <Controller
                                control={invitationForm.control}
                                name="role"
                                render={({ field, fieldState }) => (
                                    <Selector
                                        isRequired
                                        label="Role"
                                        options={ROLE_NAMES}
                                        htmlName={field.name}
                                        value={field.value}
                                        onChange={(value) => field.onChange(value)}
                                        onBlur={field.onBlur}
                                        status={
                                            fieldState.error
                                                ? { type: 'error', message: fieldState.error.message }
                                                : undefined
                                        }
                                    />
                                )}
                            />
                        </FormLayout>
                        <Stack direction="horizontal" gap={2} justify="end" wrap="wrap">
                            <Button label="Cancel" onClick={() => setInviteOpen(false)} />
                            <Button
                                label={inviteMember.isPending ? 'Inviting...' : 'Invite'}
                                type="submit"
                                isLoading={inviteMember.isPending}
                                isDisabled={inviteEmail.trim().length === 0 || !hasOrganizationSolutionAccess}
                            />
                        </Stack>
                    </Stack>
                </form>
            </Dialog>
            <DeleteConfirmation {...deleteDialog.dialogProps} />
        </PageContainer>
    );
}
