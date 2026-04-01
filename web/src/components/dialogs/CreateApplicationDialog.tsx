import { PlusCircle } from 'lucide-react';
import { Button } from '@/ui/button';
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/ui/dialog';
import { Input } from '@/ui/input';

type CreateApplicationDialogProps = {
    url: string;
    token: string;
    canCreate: boolean;
    isPending: boolean;
    error: string | null;
    onUrlChange: (value: string) => void;
    onTokenChange: (value: string) => void;
    onCreate: () => void;
};

export default function CreateApplicationDialog({
    url,
    token,
    canCreate,
    isPending,
    error,
    onUrlChange,
    onTokenChange,
    onCreate,
}: CreateApplicationDialogProps) {
    return (
        <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
                <DialogTitle>Create application</DialogTitle>
                <DialogDescription>
                    Add the app URL and app key so LongLink can fetch /metadata.json and register the app.
                </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 md:grid-cols-2">
                <Input placeholder="localhost:1707" value={url} onChange={(event) => onUrlChange(event.target.value)} />
                <Input
                    type="password"
                    placeholder="App key"
                    value={token}
                    onChange={(event) => onTokenChange(event.target.value)}
                />
            </div>

            <div className="flex justify-end">
                <Button variant="outline" onClick={onCreate} disabled={!canCreate || isPending}>
                    <PlusCircle className="h-4 w-4" />
                    {isPending ? 'Creating...' : 'Create'}
                </Button>
            </div>

            {error ? <p className="text-sm text-red-300">{error}</p> : null}
        </DialogContent>
    );
}
