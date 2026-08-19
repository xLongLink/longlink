import { useState } from 'react';
import { ROLE_NAMES } from '@/lib/roles';
import { dateFormatter } from '@/lib/utils';
import { Text } from '@astryxdesign/core/Text';
import { useToast } from '@/lib/hooks/use-toast';
import { Badge } from '@astryxdesign/core/Badge';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
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

const ORGANIZATION_ROLE_LABELS: Record<OrganizationRoles, string> = {
    read: 'read',
    write: 'write',
    maintain: 'maintainer',
    admin: 'admin',
    owner: 'owner',
};

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
    const roleChangeTargetLabel = roleChangeTarget ? ORGANIZATION_ROLE_LABELS[roleChangeTarget.role] : '';

    const memberColumns: TableColumn<OrganizationMemberAccessResponse>[] = [
        {
            key: 'member',
            header: 'User',
            width: proportional(1),
            renderCell: (member) => (
                <HStack gap={3} align="center">
                    <Avatar src={member.user.avatar} name={member.user.name} size="md" />
                    <VStack gap={1}>
                        <Text weight="semibold">{member.user.name}</Text>
                        <Text type="supporting">{member.user.email}</Text>
                    </VStack>
                </HStack>
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
                        label: `Grant ${ORGANIZATION_ROLE_LABELS[role]} permission`,
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
                <VStack gap={4}>
                    <VStack gap={1}>
                        <Heading level={2}>Members</Heading>
                        <Text type="supporting">Users who have access to this organization.</Text>
                    </VStack>
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
                </VStack>
            ) : (
                <VStack gap={4}>
                    <HStack gap={4} justify="between" align="end" wrap="wrap">
                        <VStack gap={1}>
                            <Heading level={2}>Invitations</Heading>
                            <Text type="supporting">Pending invitations to join this organization.</Text>
                            {canInviteMembers ? null : (
                                <Text type="supporting">
                                    Only maintainers, admins, and owners can send invitations.
                                </Text>
                            )}
                        </VStack>
                        <Button
                            label="Invite"
                            variant="primary"
                            isDisabled={organizationId.length === 0 || !canInviteMembers}
                            onClick={() => setInviteOpen(true)}
                        />
                    </HStack>
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
                </VStack>
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
                        ? `Grant ${roleChangeTargetLabel} permission to ${roleChangeTarget.member.user.name} in this organization?`
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
                            body: `${roleChangeTarget.member.user.name} now has ${roleChangeTargetLabel} permission`,
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
                                <VStack gap={4}>
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
                                    <HStack gap={2} justify="end" wrap="wrap">
                                        <Button label="Cancel" onClick={() => setInviteOpen(false)} />
                                        <Button
                                            label={inviteMember.isPending ? 'Inviting...' : 'Invite'}
                                            type="submit"
                                            variant="primary"
                                            isLoading={inviteMember.isPending}
                                            isDisabled={inviteEmail.trim().length === 0 || !canInviteMembers}
                                        />
                                    </HStack>
                                </VStack>
                            </form>
                        </LayoutContent>
                    }
                />
            </Dialog>
        </>
    );
}
