import { useState } from 'react';
import { ROLE_NAMES } from '@/lib/roles';
import { dateFormatter } from '@/lib/utils';
import { Stack } from '@/components/ui/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/lib/hooks/use-toast';
import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Selector } from '@astryxdesign/core/Selector';
import { TextInput } from '@astryxdesign/core/TextInput';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { useOrganizationMembers } from '@/lib/hooks/use-organization';
import { Layout as DialogLayout, LayoutContent } from '@astryxdesign/core/Layout';
import { Table, type TableColumn, pixel, proportional } from '@astryxdesign/core/Table';
import type {
    OrganizationInvitationResponse,
    OrganizationMemberAccessResponse,
    OrganizationRoles,
} from '@/lib/generated/platform-api-v1/types.gen';

/** Returns the user-facing label for an organization role. */
function roleLabel(role: OrganizationRoles) {
    return role === 'maintain' ? 'maintainer' : role;
}

/** Renders the organization people lists for settings sections. */
export default function People({
    organizationId,
    members,
    invitations,
    activeSection,
    canInviteMembers,
    canManageMembers,
    isLoading,
    error,
}: {
    organizationId: string;
    members: OrganizationMemberAccessResponse[];
    invitations: OrganizationInvitationResponse[];
    activeSection: 'members' | 'invitations';
    canInviteMembers: boolean;
    canManageMembers: boolean;
    isLoading: boolean;
    error: Error | null;
}) {
    const toast = useToast();
    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<OrganizationRoles>('write');
    const [roleChangeTarget, setRoleChangeTarget] = useState<{
        member: OrganizationMemberAccessResponse;
        role: OrganizationRoles;
    } | null>(null);
    const { inviteMember, changeMemberRole } = useOrganizationMembers(organizationId);
    const memberColumns: TableColumn<OrganizationMemberAccessResponse>[] = [
        {
            key: 'member',
            header: 'User',
            width: proportional(1),
            renderCell: (member) => (
                <Stack direction="horizontal" gap={3} align="center">
                    <Avatar src={member.user.avatar} name={member.user.name} size="md" />
                    <Stack>
                        <Text weight="semibold">{member.user.name}</Text>
                        <Text type="supporting">{member.user.email}</Text>
                    </Stack>
                </Stack>
            ),
        },
        {
            key: 'membership',
            header: 'Role',
            width: pixel(128),
            renderCell: (member) => <Badge label={member.role} />,
        },
        {
            key: 'actions',
            header: 'Action',
            width: pixel(96),
            align: 'end',
            renderCell: (member) => (
                <MoreMenu
                    label={`Open actions for ${member.user.name}`}
                    size="sm"
                    isDisabled={!canManageMembers}
                    items={ROLE_NAMES.filter((role) => role !== member.role).map((role) => ({
                        label: `Grant ${roleLabel(role)} permission`,
                        onClick: () => {
                            setRoleChangeTarget({ member, role });
                        },
                    }))}
                />
            ),
        },
    ];
    const invitationColumns: TableColumn<OrganizationInvitationResponse>[] = [
        {
            key: 'email',
            header: 'Email',
            width: proportional(1),
            renderCell: (invitation) => <Text weight="semibold">{invitation.email}</Text>,
        },
        {
            key: 'role',
            header: 'Role',
            width: pixel(128),
            renderCell: (invitation) => invitation.role,
        },
        {
            key: 'created_at',
            header: 'Created',
            width: pixel(144),
            renderCell: (invitation) => dateFormatter.format(new Date(invitation.created_at)),
        },
    ];
    return (
        <>
            {activeSection === 'members' ? (
                <Stack gap={4}>
                    <Stack>
                        <Heading level={2}>Members</Heading>
                    </Stack>
                    <Divider />
                    {isLoading && members.length === 0 ? null : error && members.length === 0 ? (
                        <Banner status="error" title="Failed to load people." />
                    ) : (
                        <Table
                            columns={memberColumns}
                            data={members}
                            density="compact"
                            emptyState={<EmptyState title="No people found." isCompact />}
                            hasHover
                            idKey={(member) => member.user.id}
                        />
                    )}
                </Stack>
            ) : (
                <Stack gap={4}>
                    <Stack direction="horizontal" gap={4} justify="between" align="end" wrap="wrap">
                        <Stack>
                            <Heading level={2}>Invitations</Heading>
                        </Stack>
                        <Button
                            label="Invite"
                            variant="secondary"
                            isDisabled={organizationId.length === 0 || !canInviteMembers}
                            onClick={() => setInviteOpen(true)}
                        />
                    </Stack>
                    <Divider />
                    {isLoading && invitations.length === 0 ? null : error && invitations.length === 0 ? (
                        <Banner status="error" title="Failed to load invitations." />
                    ) : (
                        <Table
                            columns={invitationColumns}
                            data={invitations}
                            density="compact"
                            emptyState={<EmptyState title="No invitations yet." isCompact />}
                            hasHover
                            idKey="id"
                        />
                    )}
                </Stack>
            )}

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

            <Dialog isOpen={inviteOpen} purpose="form" onOpenChange={setInviteOpen}>
                <DialogLayout
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
                                            options={[...ROLE_NAMES]}
                                            value={inviteRole}
                                            onChange={(value) => setInviteRole(value as OrganizationRoles)}
                                        />
                                    </FormLayout>
                                    <Stack direction="horizontal" gap={2} justify="end" wrap="wrap">
                                        <Button label="Cancel" onClick={() => setInviteOpen(false)} />
                                        <Button
                                            label={inviteMember.isPending ? 'Inviting...' : 'Invite'}
                                            type="submit"
                                            variant="secondary"
                                            isLoading={inviteMember.isPending}
                                            isDisabled={inviteEmail.trim().length === 0 || !canInviteMembers}
                                        />
                                    </Stack>
                                </Stack>
                            </form>
                        </LayoutContent>
                    }
                />
            </Dialog>
        </>
    );
}
