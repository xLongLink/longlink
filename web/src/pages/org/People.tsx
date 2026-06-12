import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useInviteUser } from '@/hooks/use-org';
import { ROLE_NAMES } from '@/lib/roles';
import type { ApiInvitation, ApiUserSummary } from '@/lib/types';
import { type ColumnDef } from '@tanstack/react-table';
import { Avatar, AvatarFallback, AvatarImage } from '@ui/avatar';
import { Menu, MenuSection } from '@ui/menu';
import { Mail, Users } from 'lucide-react';
import { useState } from 'react';

type PeopleProps = {
    org: string;
    people: ApiUserSummary[];
    invitations: ApiInvitation[];
    isLoading: boolean;
    error: Error | null;
};

const peopleColumns: Array<ColumnDef<ApiUserSummary>> = [
    {
        id: 'user',
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
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-foreground">{user.name}</p>
                            {user.role !== 'user' ? (
                                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    {user.role}
                                </span>
                            ) : null}
                            </div>
                        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    </div>
                </div>
            );
        },
    },
    {
        accessorKey: 'id',
        header: 'ID',
        cell: ({ getValue }) => <span className="font-medium text-foreground">#{getValue<number>()}</span>,
        meta: { className: 'w-24' },
    },
    {
        accessorKey: 'role',
        header: 'Role',
        meta: { className: 'w-32' },
    },
];

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
export default function People({ org, people, invitations, isLoading, error }: PeopleProps) {
    const [peopleSection, setPeopleSection] = useState<'members' | 'invitations'>('members');
    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<string>('write');
    const [inviteError, setInviteError] = useState<string | null>(null);
    const inviteUser = useInviteUser(org);

    return (
        <Menu
            value={peopleSection}
            onValueChange={(value) => setPeopleSection(value as 'members' | 'invitations')}
            defaultValue="members"
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
                    {isLoading ? (
                        <div className="rounded-md border p-4 text-sm text-muted-foreground">Loading people...</div>
                    ) : error ? (
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
                        </div>
                        <Button type="button" onClick={() => setInviteOpen(true)} disabled={org.length === 0}>
                            Invite
                        </Button>
                    </div>
                    <hr className="border-border" />
                    {isLoading ? (
                        <div className="rounded-md border p-4 text-sm text-muted-foreground">
                            Loading invitations...
                        </div>
                    ) : error ? (
                        <div className="rounded-md border p-4 text-sm text-destructive">
                            Failed to load invitations.
                        </div>
                    ) : invitations.length ? (
                        <DataTable columns={invitationColumns} data={invitations} />
                    ) : (
                        <div className="rounded-md border p-4 text-sm text-muted-foreground">No invitations yet.</div>
                    )}
                </div>
            </MenuSection>

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
                        </div>

                        <form
                            className="space-y-4"
                            onSubmit={async (event) => {
                                event.preventDefault();
                                setInviteError(null);

                                try {
                                    await inviteUser.mutateAsync({
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
                                <select
                                    id="invite-role"
                                    value={inviteRole}
                                    onChange={(event) => setInviteRole(event.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {ROLE_NAMES.map((role) => (
                                        <option key={role} value={role}>
                                            {role}
                                        </option>
                                    ))}
                                </select>
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
                                    disabled={inviteUser.isPending || inviteEmail.trim().length === 0}
                                >
                                    {inviteUser.isPending ? 'Inviting...' : 'Invite'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>
        </Menu>
    );
}
