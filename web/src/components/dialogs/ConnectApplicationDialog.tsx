import { Link2 } from 'lucide-react';
import { Button } from '@/ui/button';
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/ui/dialog';
import { Input } from '@/ui/input';

type ConnectApplicationDialogProps = {
    id: string;
    url: string;
    token: string;
    canConnect: boolean;
    isPending: boolean;
    error: string | null;
    onIdChange: (value: string) => void;
    onUrlChange: (value: string) => void;
    onTokenChange: (value: string) => void;
    onConnect: () => void;
};

export default function ConnectApplicationDialog({
    id,
    url,
    token,
    canConnect,
    isPending,
    error,
    onIdChange,
    onUrlChange,
    onTokenChange,
    onConnect,
}: ConnectApplicationDialogProps) {
    return (
        <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
                <DialogTitle>Connect app</DialogTitle>
                <DialogDescription>
                    Add the app URL and app key so LongLink can fetch /metadata.json and register the app.
                </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3">
                <div className="grid gap-2">
                    <p className="text-sm text-muted-foreground">Id</p>
                    <Input
                        placeholder="Optional app id"
                        value={id}
                        onChange={(event) => onIdChange(event.target.value)}
                    />
                </div>
                <div className="grid gap-2">
                    <p className="text-sm text-muted-foreground">Host</p>
                    <Input
                        placeholder="localhost:1707"
                        value={url}
                        onChange={(event) => onUrlChange(event.target.value)}
                    />
                </div>
                <div className="grid gap-2">
                    <p className="text-sm text-muted-foreground">Key</p>
                    <Input
                        type="password"
                        placeholder="App key"
                        value={token}
                        onChange={(event) => onTokenChange(event.target.value)}
                    />
                </div>
            </div>

            <div className="flex justify-end">
                <Button variant="outline" disabled={!canConnect || isPending} onClick={onConnect}>
                    <Link2 className="h-4 w-4" />
                    {isPending ? 'Connecting...' : 'Connect'}
                </Button>
            </div>

            {error ? <p className="text-sm text-red-300">{error}</p> : null}
        </DialogContent>
    );
}
