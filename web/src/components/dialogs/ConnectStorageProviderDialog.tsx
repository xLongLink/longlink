import { PlusCircle } from 'lucide-react';
import { Button } from '@/ui/button';
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/ui/dialog';
import { Input } from '@/ui/input';

type ConnectStorageProviderDialogProps = {
    providerName: string;
    endpoint: string;
    region: string;
    accessKey: string;
    secretKey: string;
    canConnect: boolean;
    onProviderNameChange: (value: string) => void;
    onEndpointChange: (value: string) => void;
    onRegionChange: (value: string) => void;
    onAccessKeyChange: (value: string) => void;
    onSecretKeyChange: (value: string) => void;
    onConnect: () => void;
};

export default function ConnectStorageProviderDialog({
    providerName,
    endpoint,
    region,
    accessKey,
    secretKey,
    canConnect,
    onProviderNameChange,
    onEndpointChange,
    onRegionChange,
    onAccessKeyChange,
    onSecretKeyChange,
    onConnect,
}: ConnectStorageProviderDialogProps) {
    return (
        <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
                <DialogTitle>Connect storage provider</DialogTitle>
                <DialogDescription>
                    Register a top-level object storage provider. Applications can create or bind buckets from these
                    connections.
                </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 md:grid-cols-2">
                <Input
                    placeholder="Provider name"
                    value={providerName}
                    onChange={(event) => onProviderNameChange(event.target.value)}
                />
                <Input
                    placeholder="Endpoint URL"
                    value={endpoint}
                    onChange={(event) => onEndpointChange(event.target.value)}
                />
                <Input
                    placeholder="Region (optional)"
                    value={region}
                    onChange={(event) => onRegionChange(event.target.value)}
                />
                <Input
                    placeholder="Access key"
                    value={accessKey}
                    onChange={(event) => onAccessKeyChange(event.target.value)}
                />
                <Input
                    type="password"
                    placeholder="Secret key"
                    value={secretKey}
                    onChange={(event) => onSecretKeyChange(event.target.value)}
                    className="md:col-span-2"
                />
            </div>

            <div className="flex justify-end">
                <Button variant="outline" onClick={onConnect} disabled={!canConnect}>
                    <PlusCircle className="h-4 w-4" />
                    Connect
                </Button>
            </div>
        </DialogContent>
    );
}
