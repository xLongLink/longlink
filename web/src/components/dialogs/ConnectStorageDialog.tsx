import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser } from '@/hooks/use-user';
import { apiUrl, fetchApiJson } from '@/lib/api';
import type { ApiLocation } from '@/lib/types';

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

    if (role !== 'administrator') {
        return null;
    }

    const storageUrl = apiUrl('/api/storage');
    const locationsUrl = apiUrl('/api/locations');
    const canSubmit =
        kind.trim().length > 0 &&
        name.trim().length > 0 &&
        protocol.trim().length > 0 &&
        endpointUrl.trim().length > 0 &&
        accessKeyId.trim().length > 0 &&
        secretAccessKey.length > 0 &&
        locationId.length > 0;

    const locationsQuery = useQuery({
        queryKey: ['api', locationsUrl],
        queryFn: async () => fetchApiJson<Array<ApiLocation>>(locationsUrl, { credentials: 'include' }),
        retry: false,
    });

    const selectedLocationName = locationsQuery.data?.find((location) => location.id === locationId)?.name;

    const connectStorage = useMutation({
        mutationFn: async () => {
            return fetchApiJson(storageUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
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
            await queryClient.invalidateQueries({ queryKey: ['api', storageUrl] });
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

    return (
        <>
            <Button type="button" onClick={() => setOpen(true)}>
                Connect
            </Button>

            <Dialog
                open={open}
                onOpenChange={(nextOpen) => {
                    setOpen(nextOpen);
                    if (!nextOpen) {
                        setError(null);
                    }
                }}
            >
                <DialogContent>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <DialogTitle>Connect storage</DialogTitle>
                            <DialogDescription>Register an object storage backend.</DialogDescription>
                        </div>

                        <form
                            className="space-y-4"
                            onSubmit={async (event) => {
                                event.preventDefault();
                                setError(null);

                                // Submit the registry and close the dialog on success.
                                try {
                                    await connectStorage.mutateAsync();
                                } catch (mutationError) {
                                    setError(
                                        mutationError instanceof Error
                                            ? mutationError.message
                                            : 'Failed to connect storage'
                                    );
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

                            <div className="space-y-2">
                                <Label htmlFor="storage-location">Location</Label>
                                <Select value={locationId} onValueChange={(value) => setLocationId(value ?? '')}>
                                    <SelectTrigger id="storage-location" className="w-full">
                                        {selectedLocationName ?? 'Choose a location'}
                                    </SelectTrigger>
                                    <SelectContent>
                                        {locationsQuery.data?.map((location) => (
                                            <SelectItem key={location.id} value={String(location.id)}>
                                                {location.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {error ? <p className="text-sm text-destructive">{error}</p> : null}

                            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setOpen(false);
                                        setError(null);
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={connectStorage.isPending || !canSubmit}>
                                    {connectStorage.isPending ? 'Connecting...' : 'Connect'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
