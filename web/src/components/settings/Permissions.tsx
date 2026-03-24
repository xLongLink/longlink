import { PlusCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import Hero from '@/components/longlink/Hero';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

type Team = {
    name: string;
    description: string;
    members: string;
    scope: string;
};

export default function Permissions() {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [members, setMembers] = useState('');
    const [scope, setScope] = useState('Organization');
    const [teams, setTeams] = useState<Team[]>([]);

    const canCreate = useMemo(() => {
        return (
            name.trim().length > 0 &&
            description.trim().length > 0 &&
            members.trim().length > 0 &&
            scope.trim().length > 0
        );
    }, [description, members, name, scope]);

    const onCreate = () => {
        if (!canCreate) {
            return;
        }

        setTeams((current) => [
            {
                name: name.trim(),
                description: description.trim(),
                members: members.trim(),
                scope: scope.trim(),
            },
            ...current,
        ]);

        setName('');
        setDescription('');
        setMembers('');
        setScope('Organization');
    };

    return (
        <div className="space-y-6">
            <Hero
                title="Permissions Settings"
                subtitle="Manage team-based access and role boundaries"
                icon="settings"
                action="Create team"
            >
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Create team</DialogTitle>
                        <DialogDescription>
                            Create a team that can be assigned to modules,
                            resources, and administration scopes.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-3 md:grid-cols-2">
                        <Input
                            placeholder="Team name"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                        />
                        <Input
                            placeholder="Description"
                            value={description}
                            onChange={(event) =>
                                setDescription(event.target.value)
                            }
                        />
                        <Input
                            placeholder="Members"
                            value={members}
                            onChange={(event) => setMembers(event.target.value)}
                        />
                        <Input
                            placeholder="Scope"
                            value={scope}
                            onChange={(event) => setScope(event.target.value)}
                        />
                    </div>

                    <div className="flex justify-end">
                        <Button
                            variant="outline"
                            onClick={onCreate}
                            disabled={!canCreate}
                        >
                            <PlusCircle className="h-4 w-4" />
                            Create
                        </Button>
                    </div>
                </DialogContent>
            </Hero>

            <Card className="overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Team</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Members</TableHead>
                            <TableHead>Scope</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {teams.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={4}
                                    className="py-8 text-center text-muted-foreground"
                                >
                                    No teams created yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            teams.map((team) => (
                                <TableRow
                                    key={`${team.name}-${team.description}`}
                                >
                                    <TableCell className="font-medium">
                                        {team.name}
                                    </TableCell>
                                    <TableCell>{team.description}</TableCell>
                                    <TableCell>{team.members}</TableCell>
                                    <TableCell>{team.scope}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
