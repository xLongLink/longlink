import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { RegistryDialogShell, RegistryLocationField } from '@/components/dialogs/RegistryDialogElements';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useLocations } from '@/hooks/use-locations';
import { useUser } from '@/hooks/use-user';
import { fetchApiJson } from '@/lib/api';
import { computesQueryKey } from '@/lib/query-keys';
import type { ApiComputeRegistry } from '@/lib/types';

/** Renders the admin compute connect dialog. */
export default function ConnectComputeDialog() {
    const { role } = useUser();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [kind, setKind] = useState('kubernetes');
    const [kubeconfig, setKubeconfig] = useState('');
    const [ingressHost, setIngressHost] = useState('');
    const [locationId, setLocationId] = useState('');
    const [error, setError] = useState<string | null>(null);

    const canSubmit =
        kind.trim().length > 0 &&
        kubeconfig.trim().length > 0 &&
        ingressHost.trim().length > 0 &&
        locationId.length > 0;

    const { items: locations } = useLocations(open);

    const connectCompute = useMutation({
        mutationFn: async () => {
            return fetchApiJson<ApiComputeRegistry>('/api/computes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    kind: kind.trim(),
                    kubeconfig,
                    ingress_host: ingressHost.trim(),
                    location_id: locationId,
                }),
            });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: computesQueryKey() });
            setOpen(false);
            setKind('kubernetes');
            setKubeconfig('');
            setIngressHost('');
            setLocationId('');
        },
    });

    if (role !== 'administrator') {
        return null;
    }

    return (
        <RegistryDialogShell
            title="Connect compute"
            description="Register a compute backend for orchestration."
            open={open}
            error={error}
            canSubmit={canSubmit}
            isPending={connectCompute.isPending}
            pendingLabel="Connecting..."
            onOpenChange={(nextOpen) => {
                setOpen(nextOpen);
                if (!nextOpen) setError(null);
            }}
            onSubmit={async () => {
                setError(null);
                try {
                    await connectCompute.mutateAsync();
                } catch (mutationError) {
                    setError(mutationError instanceof Error ? mutationError.message : 'Failed to connect compute');
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

            <RegistryLocationField
                id="compute-location"
                value={locationId}
                locations={locations}
                onValueChange={setLocationId}
            />
        </RegistryDialogShell>
    );
}
