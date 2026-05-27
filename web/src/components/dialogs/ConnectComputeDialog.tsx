import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiUrl } from '@/lib/api';

/** Renders the admin compute connect dialog. */
export default function ConnectComputeDialog() {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [kind, setKind] = useState('kubernetes');
    const [name, setName] = useState('');
    const [kubeConfigPath, setKubeConfigPath] = useState('');
    const [ingressHost, setIngressHost] = useState('');
    const [ingressName, setIngressName] = useState('');
    const [error, setError] = useState<string | null>(null);

    const computeUrl = apiUrl('/api/compute');

    const connectCompute = useMutation({
        mutationFn: async () => {
            const response = await fetch(computeUrl, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    kind: kind.trim(),
                    name: name.trim(),
                    kube_config_path: kubeConfigPath.trim(),
                    ingress_host: ingressHost.trim(),
                    ingress_name: ingressName.trim(),
                }),
            });

            if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
                throw new Error(payload?.detail ?? `API request failed (${response.status})`);
            }

            return response.json();
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['api', computeUrl] });
            setOpen(false);
            setKind('kubernetes');
            setName('');
            setKubeConfigPath('');
            setIngressHost('');
            setIngressName('');
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
                                        mutationError instanceof Error ? mutationError.message : 'Failed to connect compute'
                                    );
                                }
                            }}
                        >
                            <div className="space-y-2">
                                <Label htmlFor="compute-kind">Kind</Label>
                                <Select value={kind} onValueChange={setKind}>
                                    <SelectTrigger id="compute-kind" className="w-full">
                                        <SelectValue placeholder="Choose a compute kind" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="kubernetes">Kubernetes</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="compute-name">Name</Label>
                                <Input
                                    id="compute-name"
                                    value={name}
                                    onChange={(event) => setName(event.target.value)}
                                    placeholder="cluster-1"
                                    autoComplete="off"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="compute-kube-config">Kube config path</Label>
                                <Input
                                    id="compute-kube-config"
                                    value={kubeConfigPath}
                                    onChange={(event) => setKubeConfigPath(event.target.value)}
                                    placeholder="/home/longlink/.kube/config"
                                    autoComplete="off"
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
                                <Label htmlFor="compute-ingress-name">Ingress name</Label>
                                <Input
                                    id="compute-ingress-name"
                                    value={ingressName}
                                    onChange={(event) => setIngressName(event.target.value)}
                                    placeholder="longlink-ingress"
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
