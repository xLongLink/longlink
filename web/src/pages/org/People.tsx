import { Avatar, AvatarFallback, AvatarImage } from '@ui/avatar';
import { Menu, MenuSection } from '@ui/menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ui/table';
import { Mail, Users } from 'lucide-react';
import { useState } from 'react';
import type { ApiUserSummary } from '@/lib/types';

type PeopleProps = {
    people: ApiUserSummary[];
    isLoading: boolean;
    error: Error | null;
};

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
                <div className="w-full overflow-hidden rounded-2xl border border-border bg-card/80">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={1} className="py-8 text-sm text-muted-foreground">
                                        Loading people...
                                    </TableCell>
                                </TableRow>
                            ) : error ? (
                                <TableRow>
                                    <TableCell colSpan={1} className="py-8 text-sm text-destructive">
                                        Failed to load people.
                                    </TableCell>
                                </TableRow>
                            ) : people.length ? (
                                people.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="whitespace-normal">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="size-8">
                                                    <AvatarImage src={user.avatar} alt={`${user.name} avatar`} />
                                                    <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0 space-y-0.5">
                                                    <p className="text-sm font-medium text-foreground">{user.name}</p>
                                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={1} className="py-8 text-sm text-muted-foreground">
                                        No people found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
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
                                <TableCell className="py-8 text-sm text-muted-foreground">No invitations yet.</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </MenuSection>
        </Menu>
    );
}
