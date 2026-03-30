import { PlusCircle } from 'lucide-react';
import { Button } from '@/ui/button';
import {
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/ui/dialog';
import { Input } from '@/ui/input';

type CreateApplicationDialogProps = {
    name: string;
    slug: string;
    owner: string;
    runtime: string;
    canCreate: boolean;
    onNameChange: (value: string) => void;
    onSlugChange: (value: string) => void;
    onOwnerChange: (value: string) => void;
    onRuntimeChange: (value: string) => void;
    onCreate: () => void;
};

export default function CreateApplicationDialog({
    name,
    slug,
    owner,
    runtime,
    canCreate,
    onNameChange,
    onSlugChange,
    onOwnerChange,
    onRuntimeChange,
    onCreate,
}: CreateApplicationDialogProps) {
    return (
        <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
                <DialogTitle>Create application</DialogTitle>
                <DialogDescription>
                    Register a new application to make it available for modules,
                    storage bindings, and runtime deployment.
                </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 md:grid-cols-2">
                <Input
                    placeholder="Application name"
                    value={name}
                    onChange={(event) => onNameChange(event.target.value)}
                />
                <Input
                    placeholder="Slug"
                    value={slug}
                    onChange={(event) => onSlugChange(event.target.value)}
                />
                <Input
                    placeholder="Owner"
                    value={owner}
                    onChange={(event) => onOwnerChange(event.target.value)}
                />
                <Input
                    placeholder="Runtime"
                    value={runtime}
                    onChange={(event) => onRuntimeChange(event.target.value)}
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
