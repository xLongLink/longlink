import { Plus } from 'lucide-react';
import { Button } from '@/ui/button';
import {
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/ui/dialog';
import { Input } from '@/ui/input';

type CreateToolDialogProps = {
    name: string;
    url: string;
    isPending: boolean;
    createError: string | null;
    onNameChange: (value: string) => void;
    onUrlChange: (value: string) => void;
    onCreate: () => void;
};

export default function CreateToolDialog({
    name,
    url,
    isPending,
    createError,
    onNameChange,
    onUrlChange,
    onCreate,
}: CreateToolDialogProps) {
    return (
        <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
                <DialogTitle>Create a new tool</DialogTitle>
                <DialogDescription>
                    Add a name and URL to register your tool.
                </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 md:grid-cols-3">
                <Input
                    placeholder="Tool name"
                    value={name}
                    onChange={(event) => onNameChange(event.target.value)}
                />
                <Input
                    placeholder="http://localhost:1707/my-tool"
                    value={url}
                    onChange={(event) => onUrlChange(event.target.value)}
                />
                <Button
                    variant="outline"
                    onClick={onCreate}
                    disabled={isPending}
                >
                    <Plus className="h-4 w-4" />
                    New Tool
                </Button>
            </div>

            {createError ? (
                <p className="text-sm text-red-300">{createError}</p>
            ) : null}
        </DialogContent>
    );
}
