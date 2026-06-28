import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { RegistryDialogShell, RegistryLocationField } from '@/components/dialogs/RegistryDialogElements';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocations } from '@/hooks/use-locations';
import { useUser } from '@/hooks/use-user';
import { fetchApiJson } from '@/lib/api';
import { storagesQueryKey } from '@/lib/query-keys';

/** Renders the admin storage connect dialog. */
export default function ConnectStorageDialog() {
    const { role } = useUser();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [kind, setKind] = useState('s3');
    const [name, setName] = useState('');
    const [protocol, setProtocol] = useState('s3');
    const [endpointUrl, setEndpointUrl] = useState('');
    const [accessKeyId, setAccessKeyId] = useState('');
    const [secretAccessKey, setSecretAccessKey] = useState('');
    const [locationId, setLocationId] = useState('');
    const [error, setError] = useState<string | null>(null);

    const canSubmit =
        kind.trim().length > 0 &&
        name.trim().length > 0 &&
        protocol.trim().length > 0 &&
        endpointUrl.trim().length > 0 &&
        accessKeyId.trim().length > 0 &&
        secretAccessKey.length > 0 &&
        locationId.length > 0;

    const { items: locations } = useLocations(open);

    const connectStorage = useMutation({
        mutationFn: async () => {
            return fetchApiJson('/api/storages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    kind: kind.trim(),
                    name: name.trim(),
                    protocol: protocol.trim(),
                    endpoint_url: endpointUrl.trim(),
                    access_key_id: accessKeyId.trim(),
                    secret_access_key: secretAccessKey,
                    location_id: locationId,
                }),
            });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: storagesQueryKey() });
            setOpen(false);
            setKind('s3');
            setName('');
            setProtocol('s3');
            setEndpointUrl('');
            setAccessKeyId('');
            setSecretAccessKey('');
            setLocationId('');
        },
    });

    if (role !== 'administrator') {
        return null;
    }

    return (
        <RegistryDialogShell
            title="Connect storage"
            description="Register an object storage backend."
            open={open}
            error={error}
            canSubmit={canSubmit}
            isPending={connectStorage.isPending}
            pendingLabel="Connecting..."
            onOpenChange={(nextOpen) => {
                setOpen(nextOpen);
                if (!nextOpen) setError(null);
            }}
            onSubmit={async () => {
                setError(null);
                try {
                    await connectStorage.mutateAsync();
                } catch (mutationError) {
                    setError(mutationError instanceof Error ? mutationError.message : 'Failed to connect storage');
                }
            }}
        >
            <div className="space-y-2">
                <Label htmlFor="storage-kind">Kind</Label>
                <Select value={kind} onValueChange={(value) => setKind(value ?? '')}>
                    <SelectTrigger id="storage-kind" className="w-full">
                        <SelectValue placeholder="Choose a storage kind" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="s3">S3</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="storage-name">Name</Label>
                <Input
                    id="storage-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="assets"
                    autoComplete="off"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="storage-protocol">Protocol</Label>
                <Input
                    id="storage-protocol"
                    value={protocol}
                    onChange={(event) => setProtocol(event.target.value)}
                    placeholder="s3"
                    autoComplete="off"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="storage-endpoint">Endpoint URL</Label>
                <Input
                    id="storage-endpoint"
                    value={endpointUrl}
                    onChange={(event) => setEndpointUrl(event.target.value)}
                    placeholder="https://s3.example.com"
                    autoComplete="off"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="storage-access-key">Access key ID</Label>
                <Input
                    id="storage-access-key"
                    value={accessKeyId}
                    onChange={(event) => setAccessKeyId(event.target.value)}
                    placeholder="AKIA..."
                    autoComplete="off"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="storage-secret-key">Secret access key</Label>
                <Input
                    id="storage-secret-key"
                    type="password"
                    value={secretAccessKey}
                    onChange={(event) => setSecretAccessKey(event.target.value)}
                    autoComplete="off"
                />
            </div>

            <RegistryLocationField
                id="storage-location"
                value={locationId}
                locations={locations}
                onValueChange={setLocationId}
            />
        </RegistryDialogShell>
    );
}
