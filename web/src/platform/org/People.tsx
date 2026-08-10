import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Divider } from '@astryxdesign/core/Divider';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { useTranslator } from '@astryxdesign/core/i18n';
import { Layout as DialogLayout, LayoutContent } from '@astryxdesign/core/Layout';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Selector } from '@astryxdesign/core/Selector';
import { Table, type TableColumn, pixel, proportional } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import { useState } from 'react';
import { useChangeOrganizationMemberRole, useInviteOrganizationMember } from '@/hooks/use-organization';
import { useToast } from '@/hooks/use-toast';
import type {
    OrganizationInvitationResponse,
    OrganizationMemberAccessResponse,
} from '@/lib/generated/platform-api-v1/types.gen';
import type { Role } from '@/lib/roles';
import { ROLE_NAMES } from '@/lib/roles';
import { dateFormatter } from '@/lib/utils';

const ORGANIZATION_ROLE_LABELS: Record<Role, string> = {
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
    const t = useTranslator();
    const toast = useToast();
    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<Role>('write');
    const [roleChangeTarget, setRoleChangeTarget] = useState<{
        member: OrganizationMemberAccessResponse;
        role: Role;
    } | null>(null);
    const inviteMember = useInviteOrganizationMember(organizationId, canInviteMembers);
    const changeMemberRole = useChangeOrganizationMemberRole(organizationId, canManageMembers);
    const roleChangeTargetLabel = roleChangeTarget ? ORGANIZATION_ROLE_LABELS[roleChangeTarget.role] : '';

    const memberColumns: TableColumn<OrganizationMemberAccessResponse>[] = [
        {
            key: 'member',
            header: t('columns.user'),
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
            header: t('columns.role'),
            width: pixel(128),
            renderCell: (member) => <Badge label={member.role} />,
        },
        {
            key: 'actions',
            header: t('columns.action'),
            width: pixel(96),
            align: 'end',
            renderCell: (member) => (
                <MoreMenu
                    label={t('common.openActionsFor', { name: member.user.name })}
                    size="sm"
                    isDisabled={!canManageMembers}
                    items={ROLE_NAMES.filter((role) => role !== member.role).map((role) => ({
                        label: t('people.grantPermission', { role: ORGANIZATION_ROLE_LABELS[role] }),
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
            header: t('columns.email'),
            width: proportional(1),
            renderCell: (invitation) => <Text weight="semibold">{invitation.email}</Text>,
        },
        {
            key: 'role',
            header: t('columns.role'),
            width: pixel(128),
            renderCell: (invitation) => invitation.role,
        },
        {
            key: 'created_at',
            header: t('columns.created'),
            width: pixel(144),
            renderCell: (invitation) => dateFormatter.format(new Date(invitation.created_at)),
        },
    ];
    return (
        <>
            {activeSection === 'members' ? (
                <VStack gap={4}>
                    <VStack gap={1}>
                        <Heading level={2}>{t('people.membersTitle')}</Heading>
                        <Text type="supporting">{t('people.membersDescription')}</Text>
                    </VStack>
                    <Divider />
                    {isLoading && members.length === 0 ? null : error && members.length === 0 ? (
                        <Banner status="error" title={t('errors.loadPeople')} />
                    ) : (
                        <Table
                            columns={memberColumns}
                            data={members}
                            density="compact"
                            emptyState={<EmptyState title={t('people.noPeople')} isCompact />}
                            hasHover
                            idKey={(member) => member.user.id}
                        />
                    )}
                </VStack>
            ) : (
                <VStack gap={4}>
                    <HStack gap={4} justify="between" align="end" wrap="wrap">
                        <VStack gap={1}>
                            <Heading level={2}>{t('people.invitationsTitle')}</Heading>
                            <Text type="supporting">{t('people.invitationsDescription')}</Text>
                            {canInviteMembers ? null : (
                                <Text type="supporting">{t('people.invitationsPermissionHint')}</Text>
                            )}
                        </VStack>
                        <Button
                            label={t('actions.invite')}
                            variant="primary"
                            isDisabled={organizationId.length === 0}
                            onClick={() => setInviteOpen(true)}
                        />
                    </HStack>
                    <Divider />
                    {isLoading && invitations.length === 0 ? null : error && invitations.length === 0 ? (
                        <Banner status="error" title={t('errors.loadInvitations')} />
                    ) : (
                        <Table
                            columns={invitationColumns}
                            data={invitations}
                            density="compact"
                            emptyState={<EmptyState title={t('people.noInvitations')} isCompact />}
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
                title={t('people.changeRoleTitle')}
                description={
                    roleChangeTarget
                        ? t('people.changeRoleDescription', {
                              name: roleChangeTarget.member.user.name,
                              role: roleChangeTargetLabel,
                          })
                        : t('people.changeRoleFallback')
                }
                cancelLabel={t('actions.cancel')}
                actionLabel={t('actions.changeRole')}
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
                            body: t('people.roleChanged', {
                                name: roleChangeTarget.member.user.name,
                                role: roleChangeTargetLabel,
                            }),
                        });
                        setRoleChangeTarget(null);
                    } catch (mutationError) {
                        toast({
                            body:
                                mutationError instanceof Error
                                    ? mutationError.message
                                    : t('people.failedChangeMemberRole'),
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
                            title={t('people.inviteTitle')}
                            subtitle={t('people.inviteDescription')}
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
                                                    : t('people.failedInviteUser'),
                                            type: 'error',
                                        });
                                    }
                                }}
                            >
                                <VStack gap={4}>
                                    {canInviteMembers ? null : (
                                        <Text type="supporting">{t('people.invitePermissionHint')}</Text>
                                    )}
                                    <FormLayout>
                                        <TextInput
                                            label={t('labels.email')}
                                            type="email"
                                            value={inviteEmail}
                                            placeholder="user@example.com"
                                            onChange={setInviteEmail}
                                            isRequired
                                        />
                                        <Selector
                                            isRequired
                                            label={t('columns.role')}
                                            options={[...ROLE_NAMES]}
                                            value={inviteRole}
                                            onChange={(value) => setInviteRole(value as Role)}
                                        />
                                    </FormLayout>
                                    <HStack gap={2} justify="end" wrap="wrap">
                                        <Button label={t('actions.cancel')} onClick={() => setInviteOpen(false)} />
                                        <Button
                                            label={inviteMember.isPending ? t('actions.inviting') : t('actions.invite')}
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
