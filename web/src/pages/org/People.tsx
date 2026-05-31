import { DataTable } from '@/components/DataTable';
import type { ApiUserSummary } from '@/lib/types';
import { type ColumnDef } from '@tanstack/react-table';
import { Avatar, AvatarFallback, AvatarImage } from '@ui/avatar';
import { Menu, MenuSection } from '@ui/menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ui/table';
import { Mail, Users } from 'lucide-react';
import { useState } from 'react';

type PeopleProps = {
    people: ApiUserSummary[];
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
                            {user.admin ? (
                                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Admin
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
        accessorKey: 'admin',
        header: 'Admin',
        cell: ({ getValue }) => (getValue<boolean>() ? 'Yes' : 'No'),
        meta: { className: 'w-24' },
    },
];

/** Renders the organization people menu and member tables. */
export default function People({ people, isLoading, error }: PeopleProps) {
    const [peopleSection, setPeopleSection] = useState<'members' | 'invitations'>('members');

    return (
        <Menu
            value={peopleSection}
            onValueChange={(value) => setPeopleSection(value as 'members' | 'invitations')}
            defaultValue="members"
            className="items-start"
            ariaLabel="People menu"
        >
            <MenuSection value="members" label="Members" icon={Users}>
                {isLoading ? (
                    <div className="rounded-md border p-4 text-sm text-muted-foreground">Loading people...</div>
                ) : error ? (
                    <div className="rounded-md border p-4 text-sm text-destructive">Failed to load people.</div>
                ) : people.length ? (
                    <DataTable columns={peopleColumns} data={people} />
                ) : (
                    <div className="rounded-md border p-4 text-sm text-muted-foreground">No people found.</div>
                )}
            </MenuSection>

            <MenuSection value="invitations" label="Invitations" icon={Mail}>
                <div className="w-full overflow-hidden rounded-2xl border border-border bg-card/80">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Invitation</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="py-8 text-sm text-muted-foreground">
                                    No invitations yet.
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </MenuSection>
        </Menu>
    );
}
