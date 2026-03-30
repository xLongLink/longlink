import { PlusCircle } from 'lucide-react';
import { Button } from '@/ui/button';
import {
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/ui/dialog';
import { Input } from '@/ui/input';

type CreateTeamDialogProps = {
    name: string;
    description: string;
    members: string;
    scope: string;
    canCreate: boolean;
    onNameChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
    onMembersChange: (value: string) => void;
    onScopeChange: (value: string) => void;
    onCreate: () => void;
};

export default function CreateTeamDialog({
    name,
    description,
    members,
    scope,
    canCreate,
    onNameChange,
    onDescriptionChange,
    onMembersChange,
    onScopeChange,
    onCreate,
}: CreateTeamDialogProps) {
    return (
        <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
                <DialogTitle>Create team</DialogTitle>
                <DialogDescription>
                    Create a team that can be assigned to modules, resources,
                    and administration scopes.
                </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 md:grid-cols-2">
                <Input
                    placeholder="Team name"
                    value={name}
                    onChange={(event) => onNameChange(event.target.value)}
                />
                <Input
                    placeholder="Description"
                    value={description}
                    onChange={(event) =>
                        onDescriptionChange(event.target.value)
                    }
                />
                <Input
                    placeholder="Members"
                    value={members}
                    onChange={(event) => onMembersChange(event.target.value)}
                />
                <Input
                    placeholder="Scope"
                    value={scope}
                    onChange={(event) => onScopeChange(event.target.value)}
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
    );
}
