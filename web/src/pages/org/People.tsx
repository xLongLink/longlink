import { DataTable } from '@/components/DataTable';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { useOrganizationActions } from '@/hooks/use-organization';
import { useTranslation } from '@/lib/i18n';
import type { Role } from '@/lib/roles';
import { ROLE_NAMES } from '@/lib/roles';
import type { ApiInvitation, ApiOrganizationMemberSummary } from '@/lib/types';
import { formatDate, getInitials } from '@/lib/utils';
import { type ColumnDef } from '@tanstack/react-table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BookOpen, Crown, GitPullRequest, MoreVertical, PenLine, Settings2, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

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

const ORGANIZATION_ROLE_ICONS: Record<Role, LucideIcon> = {
    read: BookOpen,
    write: GitPullRequest,
    maintain: PenLine,
    admin: Settings2,
    owner: Crown,
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
    const { t } = useTranslation();
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

    const isMembersSection = activeSection === 'members';
    const isInvitationsSection = activeSection === 'invitations';

    const peopleColumns: Array<ColumnDef<ApiOrganizationMemberSummary>> = [
        {
            id: 'member',
            header: t('columns.user'),
            cell: ({ row }) => {
                const user = row.original;

                return (
                    <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                            <AvatarImage src={user.avatar} alt={`${user.name} avatar`} />
                            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 space-y-0.5">
                            <div className="text-sm font-medium text-foreground">{user.name}</div>
                            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                        </div>
                    </div>
                );
            },
            meta: { className: 'w-px pr-1 whitespace-nowrap' },
        },
        {
            id: 'membership',
            header: () => null,
            cell: ({ row }) => {
                const user = row.original;

                return (
                    <div className="flex items-center justify-start">
                        <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium capitalize text-muted-foreground">
                            {user.role}
                        </span>
                    </div>
                );
            },
            meta: { className: 'w-px pl-1 whitespace-nowrap text-left' },
        },
        {
            id: 'actions',
            header: t('columns.action'),
            meta: { className: 'w-px pl-1 whitespace-nowrap text-right' },
            cell: ({ row }) => {
                const user = row.original;

                return (
                    <div className="flex justify-end">
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        className="cursor-pointer"
                                        disabled={!canManageMembers}
                                        aria-label={t('common.openActionsFor', { name: user.name })}
                                    />
                                }
                            >
                                <MoreVertical className="size-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64">
                                {ROLE_NAMES.filter((role) => role !== user.role).map((role) => {
                                    const RoleIcon = ORGANIZATION_ROLE_ICONS[role];

                                    return (
                                        <DropdownMenuItem
                                            key={role}
                                            className="cursor-pointer gap-3"
                                            onClick={() => {
                                                setRoleChangeTarget({ user, role });
                                                setRoleChangeError(null);
                                            }}
                                        >
                                            <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-accent/10 text-accent [&_svg]:size-4 [&_svg]:stroke-[2.5]">
                                                <RoleIcon aria-hidden={true} className="size-4" />
                                            </span>
                                            <span>
                                                {t('people.grantPermission', {
                                                    role: ORGANIZATION_ROLE_LABELS[role],
                                                })}
                                            </span>
                                        </DropdownMenuItem>
                                    );
                                })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                );
            },
        },
    ];

    const localizedInvitationColumns: Array<ColumnDef<ApiInvitation>> = [
        {
            accessorKey: 'email',
            header: t('columns.email'),
            cell: ({ getValue }) => <span className="font-medium text-foreground">{getValue<string>()}</span>,
        },
        {
            accessorKey: 'role',
            header: t('columns.role'),
            meta: { className: 'w-24' },
        },
        {
            accessorKey: 'created_at',
            header: t('columns.created'),
            cell: ({ getValue }) => formatDate(getValue<string>()),
            meta: { className: 'w-32' },
        },
    ];

    return (
        <>
            {isMembersSection ? (
                <div className="space-y-4">
                    <div className="space-y-1">
                        <h2 className="text-lg font-medium text-foreground">{t('people.membersTitle')}</h2>
                        <p className="text-sm text-muted-foreground">{t('people.membersDescription')}</p>
                    </div>
                    <hr className="border-border" />
                    {isLoading ? null : error ? (
                        <div className="rounded-md border p-4 text-sm text-destructive">{t('errors.loadPeople')}</div>
                    ) : people.length ? (
                        <DataTable columns={peopleColumns} data={people} />
                    ) : (
                        <div className="rounded-md border p-4 text-sm text-muted-foreground">
                            {t('people.noPeople')}
                        </div>
                    )}
                </div>
            ) : null}

            {isInvitationsSection ? (
                <div className="space-y-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <h2 className="text-lg font-medium text-foreground">{t('people.invitationsTitle')}</h2>
                            <p className="text-sm text-muted-foreground">{t('people.invitationsDescription')}</p>
                            {canInviteMembers ? null : (
                                <p className="text-sm text-muted-foreground">{t('people.invitationsPermissionHint')}</p>
                            )}
                        </div>
                        <Button type="button" onClick={() => setInviteOpen(true)} disabled={organization.length === 0}>
                            {t('actions.invite')}
                        </Button>
                    </div>
                    <hr className="border-border" />
                    {isLoading ? null : error ? (
                        <div className="rounded-md border p-4 text-sm text-destructive">
                            {t('errors.loadInvitations')}
                        </div>
                    ) : invitations.length ? (
                        <DataTable columns={localizedInvitationColumns} data={invitations} />
                    ) : (
                        <div className="rounded-md border p-4 text-sm text-muted-foreground">
                            {t('people.noInvitations')}
                        </div>
                    )}
                </div>
            ) : null}

            <AlertDialog
                open={roleChangeTarget !== null}
                onOpenChange={(nextOpen) => {
                    // Reset pending role changes when the dialog closes.
                    if (!nextOpen) {
                        setRoleChangeTarget(null);
                        setRoleChangeError(null);
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('people.changeRoleTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {roleChangeTarget
                                ? t('people.changeRoleDescription', {
                                      name: roleChangeTarget.user.name,
                                      role: roleChangeTargetLabel,
                                  })
                                : t('people.changeRoleFallback')}
                        </AlertDialogDescription>
                        {roleChangeError ? <p className="text-sm text-destructive">{roleChangeError}</p> : null}
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            onClick={() => {
                                setRoleChangeTarget(null);
                                setRoleChangeError(null);
                            }}
                        >
                            {t('actions.cancel')}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            type="button"
                            disabled={isChangingMemberRole || roleChangeTarget === null}
                            onClick={async () => {
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
                                    toast.success(
                                        t('people.roleChanged', {
                                            name: roleChangeTarget.user.name,
                                            role: roleChangeTargetLabel,
                                        })
                                    );
                                    setRoleChangeTarget(null);
                                    setRoleChangeError(null);
                                } catch (mutationError) {
                                    setRoleChangeError(
                                        mutationError instanceof Error
                                            ? mutationError.message
                                            : t('people.failedChangeMemberRole')
                                    );
                                }
                            }}
                        >
                            {isChangingMemberRole ? t('actions.saving') : t('actions.changeRole')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog
                open={inviteOpen}
                onOpenChange={(nextOpen) => {
                    setInviteOpen(nextOpen);
                    // Clear invitation errors when the dialog closes.
                    if (!nextOpen) {
                        setInviteError(null);
                    }
                }}
            >
                <DialogContent>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <DialogTitle>{t('people.inviteTitle')}</DialogTitle>
                            <DialogDescription>{t('people.inviteDescription')}</DialogDescription>
                            {canInviteMembers ? null : (
                                <p className="text-sm text-muted-foreground">{t('people.invitePermissionHint')}</p>
                            )}
                        </div>

                        <form
                            className="space-y-4"
                            onSubmit={async (event) => {
                                event.preventDefault();
                                setInviteError(null);

                                // Submit the invitation and surface any failure.
                                try {
                                    await inviteMember({
                                        email: inviteEmail.trim(),
                                        role: inviteRole,
                                    });
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
                            <div className="space-y-2">
                                <Label htmlFor="invite-email">{t('labels.email')}</Label>
                                <Input
                                    id="invite-email"
                                    type="email"
                                    value={inviteEmail}
                                    onChange={(event) => setInviteEmail(event.target.value)}
                                    placeholder="user@example.com"
                                    autoComplete="off"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="invite-role">{t('columns.role')}</Label>
                                <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as Role)}>
                                    <SelectTrigger id="invite-role" className="w-full">
                                        {inviteRole}
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ROLE_NAMES.map((role) => (
                                            <SelectItem key={role} value={role}>
                                                {role}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {inviteError ? <p className="text-sm text-destructive">{inviteError}</p> : null}

                            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setInviteOpen(false);
                                        setInviteError(null);
                                    }}
                                >
                                    {t('actions.cancel')}
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isInviting || inviteEmail.trim().length === 0 || !canInviteMembers}
                                >
                                    {isInviting ? t('actions.inviting') : t('actions.invite')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
