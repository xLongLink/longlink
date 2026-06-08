import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { apiUrl, fetchApiJson } from '@/lib/api';
import type { ApiComputeRegistry, ApiLocation } from '@/lib/types';

/** Renders the admin compute connect dialog. */
export default function ConnectComputeDialog() {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [kind, setKind] = useState('kubernetes');
    const [kubeconfig, setKubeconfig] = useState('');
    const [ingressHost, setIngressHost] = useState('');
    const [locationId, setLocationId] = useState('');
    const [error, setError] = useState<string | null>(null);

    const computeUrl = apiUrl('/api/compute');
    const locationsUrl = apiUrl('/api/locations');

    const locationsQuery = useQuery({
        queryKey: ['api', locationsUrl],
        queryFn: async () => fetchApiJson<Array<ApiLocation>>(locationsUrl, { credentials: 'include' }),
        retry: false,
    });

    const connectCompute = useMutation({
        mutationFn: async () => {
            return fetchApiJson<ApiComputeRegistry>(computeUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    kind: kind.trim(),
                    kubeconfig,
                    ingress_host: ingressHost.trim(),
                    location_id: Number(locationId),
                }),
            });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['api', computeUrl] });
            setOpen(false);
            setKind('kubernetes');
            setKubeconfig('');
            setIngressHost('');
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
                            <DialogTitle>Connect compute</DialogTitle>
                            <DialogDescription>Register a compute backend for orchestration.</DialogDescription>
                        </div>

                        <form
                            className="space-y-4"
                            onSubmit={async (event) => {
                                event.preventDefault();
                                setError(null);

                                // Submit the registry and close the dialog on success.
                                try {
                                    await connectCompute.mutateAsync();
                                } catch (mutationError) {
                                    setError(
                                        mutationError instanceof Error
                                            ? mutationError.message
                                            : 'Failed to connect compute'
                                    );
                                }
                            }}
                        >
                            <div className="space-y-2">
                                <Label htmlFor="compute-kind">Kind</Label>
                                <Select value={kind} onValueChange={(value) => setKind(value ?? '')}>
                                    <SelectTrigger id="compute-kind" className="w-full">
                                        <SelectValue placeholder="Choose a compute kind" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="kubernetes">Kubernetes</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="compute-kubeconfig">Kubeconfig</Label>
                                <Textarea
                                    id="compute-kubeconfig"
                                    value={kubeconfig}
                                    onChange={(event) => setKubeconfig(event.target.value)}
                                    placeholder="Paste the kubeconfig file contents"
                                    className="min-h-40 max-w-full overflow-auto resize-y [field-sizing:fixed]"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="compute-ingress-host">Ingress host</Label>
                                <Input
                                    id="compute-ingress-host"
                                    value={ingressHost}
                                    onChange={(event) => setIngressHost(event.target.value)}
                                    placeholder="apps.example.com"
                                    autoComplete="off"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="compute-location">Location</Label>
                                <Select value={locationId} onValueChange={(value) => setLocationId(value ?? '')}>
                                    <SelectTrigger id="compute-location" className="w-full">
                                        <SelectValue placeholder="Choose a location" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {locationsQuery.data?.map((location) => (
                                            <SelectItem key={location.id} value={String(location.id)}>
                                                {location.display_name}
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
                                <Button type="submit" disabled={connectCompute.isPending}>
                                    {connectCompute.isPending ? 'Connecting...' : 'Connect'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
