import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiUrl } from '@/lib/api';

/** Renders the admin storage connect dialog. */
export default function ConnectStorageDialog() {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [kind, setKind] = useState('s3');
    const [name, setName] = useState('');
    const [protocol, setProtocol] = useState('s3');
    const [endpointUrl, setEndpointUrl] = useState('');
    const [accessKeyId, setAccessKeyId] = useState('');
    const [secretAccessKey, setSecretAccessKey] = useState('');
    const [error, setError] = useState<string | null>(null);

    const storageUrl = apiUrl('/api/storage');

    const connectStorage = useMutation({
        mutationFn: async () => {
            const response = await fetch(storageUrl, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
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
                }),
            });

            if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
                throw new Error(payload?.detail ?? `API request failed (${response.status})`);
            }

            return response.json();
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
                                        mutationError instanceof Error ? mutationError.message : 'Failed to connect storage'
                                    );
                                }
                            }}
                        >
                            <div className="space-y-2">
                                <Label htmlFor="storage-kind">Kind</Label>
                                <Select value={kind} onValueChange={setKind}>
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
                                <Button type="submit" disabled={connectStorage.isPending}>
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
