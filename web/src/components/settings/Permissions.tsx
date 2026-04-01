import { useMemo, useState } from 'react';
import { CreateTeamDialog } from '@/components/dialogs';
import Hero from '@/longlink/Hero';
import { Card } from '@/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';

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
                <CreateTeamDialog
                    name={name}
                    description={description}
                    members={members}
                    scope={scope}
                    canCreate={canCreate}
                    onNameChange={setName}
                    onDescriptionChange={setDescription}
                    onMembersChange={setMembers}
                    onScopeChange={setScope}
                    onCreate={onCreate}
                />
            </Hero>

            <Card className="gap-0 overflow-hidden py-0">
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
                                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                                    No teams created yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            teams.map((team) => (
                                <TableRow key={`${team.name}-${team.description}`}>
                                    <TableCell className="font-medium">{team.name}</TableCell>
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
