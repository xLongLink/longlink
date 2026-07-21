import { useState } from 'react';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { useToast } from '@astryxdesign/core/Toast';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { Selector } from '@astryxdesign/core/Selector';
import { useTranslator } from '@astryxdesign/core/i18n';
import { TextInput } from '@astryxdesign/core/TextInput';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout as DialogLayout, LayoutContent } from '@astryxdesign/core/Layout';
import { Table, type TableColumn, pixel, proportional } from '@astryxdesign/core/Table';
import type { Role } from '@/lib/roles';
import type { ApiInvitation, ApiOrganizationMemberSummary } from '@/lib/types';
import { ROLE_NAMES } from '@/lib/roles';
import { formatDate } from '@/lib/utils';
import { useOrganizationActions } from '@/hooks/use-organization';

type PeopleProps = {
    organization: string;
    people: ApiOrganizationMemberSummary[];
    invitations: ApiInvitation[];
    activeSection?: 'members' | 'invitations';
    isLoading: boolean;
    error: Error | null;
};

const ORGANIZATION_ROLE_LABELS: Record<Role, string> = {
    read: 'read',
    write: 'write',
    maintain: 'maintainer',
    admin: 'admin',
    owner: 'owner',
};

/** Renders the organization people lists for settings sections. */
export default function People({
    organization,
    people,
    invitations,
    activeSection = 'members',
    isLoading,
    error,
}: PeopleProps) {
    const t = useTranslator();
    const toast = useToast();
    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<Role>('write');
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [roleChangeTarget, setRoleChangeTarget] = useState<{
        user: ApiOrganizationMemberSummary;
        role: Role;
    } | null>(null);
    const [roleChangeError, setRoleChangeError] = useState<string | null>(null);
    const { inviteMember, isInviting, canInviteMembers, changeMemberRole, isChangingMemberRole, canManageMembers } =
        useOrganizationActions(organization);
    const roleChangeTargetLabel = roleChangeTarget ? ORGANIZATION_ROLE_LABELS[roleChangeTarget.role] : '';

    const peopleColumns: TableColumn<ApiOrganizationMemberSummary>[] = [
        {
            key: 'member',
            header: t('columns.user'),
            width: proportional(1),
            renderCell: (user) => (
                <HStack gap={3} align="center">
                    <Avatar src={user.avatar} name={user.name} size="small" />
                    <VStack gap={1}>
                        <Text weight="semibold">{user.name}</Text>
                        <Text type="supporting">{user.email}</Text>
                    </VStack>
                </HStack>
            ),
        },
        {
            key: 'membership',
            header: t('columns.role'),
            width: pixel(128),
            renderCell: (user) => <Badge label={user.role} />,
        },
        {
            key: 'actions',
            header: t('columns.action'),
            width: pixel(96),
            align: 'end',
            renderCell: (user) => (
                <MoreMenu
                    label={t('common.openActionsFor', { name: user.name })}
                    size="sm"
                    isDisabled={!canManageMembers}
                    items={ROLE_NAMES.filter((role) => role !== user.role).map((role) => ({
                        label: t('people.grantPermission', { role: ORGANIZATION_ROLE_LABELS[role] }),
                        onClick: () => {
                            setRoleChangeTarget({ user, role });
                            setRoleChangeError(null);
                        },
                    }))}
                />
            ),
        },
    ];
    const invitationColumns: TableColumn<ApiInvitation>[] = [
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
            renderCell: (invitation) => formatDate(invitation.created_at),
        },
    ];
    const peopleError = error ? new Error(t('errors.loadPeople')) : null;
    const invitationsError = error ? new Error(t('errors.loadInvitations')) : null;

    return (
        <>
            {activeSection === 'members' ? (
                <VStack gap={4}>
                    <VStack gap={1}>
                        <Heading level={2}>{t('people.membersTitle')}</Heading>
                        <Text type="supporting">{t('people.membersDescription')}</Text>
                    </VStack>
                    <Divider />
                    {isLoading && people.length === 0 ? null : peopleError && people.length === 0 ? (
                        <Banner status="error" title={peopleError.message} />
                    ) : (
                        <Table
                            columns={peopleColumns}
                            data={people}
                            density="compact"
                            emptyState={<EmptyState title={t('people.noPeople')} isCompact />}
                            hasHover
                            idKey="id"
                        />
                    )}
                </VStack>
            ) : null}

            {activeSection === 'invitations' ? (
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
                            isDisabled={organization.length === 0}
                            onClick={() => setInviteOpen(true)}
                        />
                    </HStack>
                    <Divider />
                    {isLoading && invitations.length === 0 ? null : invitationsError && invitations.length === 0 ? (
                        <Banner status="error" title={invitationsError.message} />
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
            ) : null}

            <AlertDialog
                isOpen={roleChangeTarget !== null}
                onOpenChange={(nextOpen) => {
                    // Reset pending role changes when the dialog closes.
                    if (!nextOpen) {
                        setRoleChangeTarget(null);
                        setRoleChangeError(null);
                    }
                }}
                title={t('people.changeRoleTitle')}
                description={`${
                    roleChangeTarget
                        ? t('people.changeRoleDescription', {
                              name: roleChangeTarget.user.name,
                              role: roleChangeTargetLabel,
                          })
                        : t('people.changeRoleFallback')
                }${roleChangeError ? ` ${roleChangeError}` : ''}`}
                cancelLabel={t('actions.cancel')}
                actionLabel={t('actions.changeRole')}
                actionVariant="primary"
                isActionLoading={isChangingMemberRole}
                onAction={async () => {
                    // Ignore submissions without a selected role change.
                    if (roleChangeTarget === null) {
                        return;
                    }

                    // Persist the selected organization role.
                    try {
                        await changeMemberRole({
                            memberId: roleChangeTarget.user.id,
                            role: roleChangeTarget.role,
                        });
                        toast({
                            body: t('people.roleChanged', {
                                name: roleChangeTarget.user.name,
                                role: roleChangeTargetLabel,
                            }),
                        });
                        setRoleChangeTarget(null);
                        setRoleChangeError(null);
                    } catch (mutationError) {
                        setRoleChangeError(
                            mutationError instanceof Error ? mutationError.message : t('people.failedChangeMemberRole')
                        );
                    }
                }}
            />

            <Dialog
                isOpen={inviteOpen}
                purpose="form"
                onOpenChange={(nextOpen) => {
                    setInviteOpen(nextOpen);

                    // Clear invitation errors when the dialog closes.
                    if (!nextOpen) {
                        setInviteError(null);
                    }
                }}
            >
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
                                    setInviteError(null);

                                    // Submit the invitation and surface any failure.
                                    try {
                                        await inviteMember({ email: inviteEmail.trim(), role: inviteRole });
                                        setInviteOpen(false);
                                        setInviteEmail('');
                                        setInviteRole('write');
                                    } catch (mutationError) {
                                        setInviteError(
                                            mutationError instanceof Error
                                                ? mutationError.message
                                                : t('people.failedInviteUser')
                                        );
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
                                            label={t('columns.role')}
                                            options={[...ROLE_NAMES]}
                                            value={inviteRole}
                                            onChange={(value) => setInviteRole(value as Role)}
                                        />
                                    </FormLayout>
                                    {inviteError ? <Banner status="error" title={inviteError} /> : null}
                                    <HStack gap={2} justify="end" wrap="wrap">
                                        <Button
                                            label={t('actions.cancel')}
                                            onClick={() => {
                                                setInviteOpen(false);
                                                setInviteError(null);
                                            }}
                                        />
                                        <Button
                                            label={isInviting ? t('actions.inviting') : t('actions.invite')}
                                            type="submit"
                                            variant="primary"
                                            isLoading={isInviting}
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
