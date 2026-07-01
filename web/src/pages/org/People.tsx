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
import type { Role } from '@/lib/roles';
import { ROLE_NAMES } from '@/lib/roles';
import type { ApiInvitation, ApiOrganizationMemberSummary } from '@/lib/types';
import { type ColumnDef } from '@tanstack/react-table';
import { Avatar, AvatarFallback, AvatarImage } from '@ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@ui/dropdown-menu';
import { Menu, MenuSection } from '@ui/menu';
import { Mail, MoreVertical, Users } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

type PeopleProps = {
    organization: string;
    people: ApiOrganizationMemberSummary[];
    invitations: ApiInvitation[];
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

const invitationColumns: Array<ColumnDef<ApiInvitation>> = [
    {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ getValue }) => <span className="font-medium text-foreground">{getValue<string>()}</span>,
    },
    {
        accessorKey: 'role',
        header: 'Role',
        meta: { className: 'w-24' },
    },
    {
        accessorKey: 'created_at',
        header: 'Created',
        cell: ({ getValue }) => new Date(getValue<string>()).toLocaleDateString(),
        meta: { className: 'w-32' },
    },
];

/** Renders the organization people menu and member tables. */
export default function People({ organization, people, invitations, isLoading, error }: PeopleProps) {
    const [peopleSection, setPeopleSection] = useState<'members' | 'invitations'>('members');
    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<Role>('write');
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [roleChangeTarget, setRoleChangeTarget] = useState<{
        user: ApiOrganizationMemberSummary;
        role: Role;
    } | null>(null);
    const [roleChangeError, setRoleChangeError] = useState<string | null>(null);
    const {
        inviteMember,
        isInviting,
        canInviteMembers,
        changeMemberRole,
        isChangingMemberRole,
        canManageMembers,
    } = useOrganizationActions(organization);
    const roleChangeTargetLabel = roleChangeTarget ? ORGANIZATION_ROLE_LABELS[roleChangeTarget.role] : '';

    const peopleColumns: Array<ColumnDef<ApiOrganizationMemberSummary>> = [
        {
            id: 'member',
            header: 'User',
            cell: ({ row }) => {
                const user = row.original;

                return (
                    <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                            <AvatarImage src={user.avatar} alt={`${user.name} avatar`} />
                            <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
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
            header: 'Action',
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
                                        aria-label={`Open actions for ${user.name}`}
                                    />
                                }
                            >
                                <MoreVertical className="size-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                                {ROLE_NAMES.filter((role) => role !== user.role).map((role) => (
                                    <DropdownMenuItem
                                        key={role}
                                        className="cursor-pointer"
                                        onClick={() => {
                                            setRoleChangeTarget({ user, role });
                                            setRoleChangeError(null);
                                        }}
                                    >
                                        Grant {ORGANIZATION_ROLE_LABELS[role]} permission
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                );
            },
        },
    ];

    return (
        <>
            <Menu
                value={peopleSection}
                onValueChange={(value) => setPeopleSection(value as 'members' | 'invitations')}
                defaultValue="members"
                hashNavigation
                className="items-start"
                ariaLabel="People menu"
            >
                <MenuSection value="members" label="Members" icon={Users}>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <h2 className="text-lg font-medium text-foreground">Members</h2>
                            <p className="text-sm text-muted-foreground">Users who have access to this organization.</p>
                        </div>
                        <hr className="border-border" />
                        {isLoading ? null : error ? (
                            <div className="rounded-md border p-4 text-sm text-destructive">Failed to load people.</div>
                        ) : people.length ? (
                            <DataTable columns={peopleColumns} data={people} />
                        ) : (
                            <div className="rounded-md border p-4 text-sm text-muted-foreground">No people found.</div>
                        )}
                    </div>
                </MenuSection>

                <MenuSection value="invitations" label="Invitations" icon={Mail}>
                    <div className="space-y-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-1">
                                <h2 className="text-lg font-medium text-foreground">Invitations</h2>
                                <p className="text-sm text-muted-foreground">
                                    Pending invitations to join this organization.
                                </p>
                                {canInviteMembers ? null : (
                                    <p className="text-sm text-muted-foreground">
                                        Only maintainers, admins, and owners can send invitations.
                                    </p>
                                )}
                            </div>
                            <Button
                                type="button"
                                onClick={() => setInviteOpen(true)}
                                disabled={organization.length === 0}
                            >
                                Invite
                            </Button>
                        </div>
                        <hr className="border-border" />
                        {isLoading ? null : error ? (
                            <div className="rounded-md border p-4 text-sm text-destructive">
                                Failed to load invitations.
                            </div>
                        ) : invitations.length ? (
                            <DataTable columns={invitationColumns} data={invitations} />
                        ) : (
                            <div className="rounded-md border p-4 text-sm text-muted-foreground">
                                No invitations yet.
                            </div>
                        )}
                    </div>
                </MenuSection>
            </Menu>

            <AlertDialog
                open={roleChangeTarget !== null}
                onOpenChange={(nextOpen) => {
                    if (!nextOpen) {
                        setRoleChangeTarget(null);
                        setRoleChangeError(null);
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Change member role</AlertDialogTitle>
                        <AlertDialogDescription>
                            {roleChangeTarget
                                ? `Grant ${roleChangeTargetLabel} permission to ${roleChangeTarget.user.name} in this organization?`
                                : 'Change this member role?'}
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
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            type="button"
                            disabled={isChangingMemberRole || roleChangeTarget === null}
                            onClick={async () => {
                                if (roleChangeTarget === null) {
                                    return;
                                }

                                try {
                                    await changeMemberRole({
                                        memberId: roleChangeTarget.user.id,
                                        role: roleChangeTarget.role,
                                    });
                                    toast.success(
                                        `${roleChangeTarget.user.name} now has ${roleChangeTargetLabel} permission`
                                    );
                                    setRoleChangeTarget(null);
                                    setRoleChangeError(null);
                                } catch (mutationError) {
                                    setRoleChangeError(
                                        mutationError instanceof Error
                                            ? mutationError.message
                                            : 'Failed to change member role'
                                    );
                                }
                            }}
                        >
                            {isChangingMemberRole ? 'Saving...' : 'Change role'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog
                open={inviteOpen}
                onOpenChange={(nextOpen) => {
                    setInviteOpen(nextOpen);
                    if (!nextOpen) {
                        setInviteError(null);
                    }
                }}
            >
                <DialogContent>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <DialogTitle>Invite user</DialogTitle>
                            <DialogDescription>Send an invitation to join this organization.</DialogDescription>
                            {canInviteMembers ? null : (
                                <p className="text-sm text-muted-foreground">
                                    You need maintainer, admin, or owner access to invite members.
                                </p>
                            )}
                        </div>

                        <form
                            className="space-y-4"
                            onSubmit={async (event) => {
                                event.preventDefault();
                                setInviteError(null);

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
                                        mutationError instanceof Error ? mutationError.message : 'Failed to invite user'
                                    );
                                }
                            }}
                        >
                            <div className="space-y-2">
                                <Label htmlFor="invite-email">Email</Label>
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
                                <Label htmlFor="invite-role">Role</Label>
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
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isInviting || inviteEmail.trim().length === 0 || !canInviteMembers}
                                >
                                    {isInviting ? 'Inviting...' : 'Invite'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
