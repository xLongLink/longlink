import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { RegistryDialogShell, RegistryLocationField } from '@/components/dialogs/RegistryDialogElements';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useLocations } from '@/data/admin';
import { useUserProfile } from '@/hooks/use-user';
import { fetchApiJson } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { computesQueryKey } from '@/lib/query-keys';
import type { ApiComputeRegistry } from '@/lib/types';

/** Renders the admin compute connect dialog. */
export default function ConnectComputeDialog() {
    const { t } = useTranslation();
    const { role } = useUserProfile();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [kind, setKind] = useState('kubernetes');
    const [kubeconfig, setKubeconfig] = useState('');
    const [ingressHost, setIngressHost] = useState('');
    const [gatewayTlsKey, setGatewayTlsKey] = useState('');
    const [gatewayTlsCertificate, setGatewayTlsCertificate] = useState('');
    const [gatewayLoadBalancerIp, setGatewayLoadBalancerIp] = useState('');
    const [locationId, setLocationId] = useState('');
    const [error, setError] = useState<string | null>(null);
    const hasGatewayTlsKey = gatewayTlsKey.trim().length > 0;
    const hasGatewayTlsCertificate = gatewayTlsCertificate.trim().length > 0;

    /** Clears sensitive compute connection form state. */
    function resetDialogState() {
        setKind('kubernetes');
        setKubeconfig('');
        setIngressHost('');
        setGatewayTlsKey('');
        setGatewayTlsCertificate('');
        setGatewayLoadBalancerIp('');
        setLocationId('');
        setError(null);
    }

    const canSubmit =
        kind.trim().length > 0 &&
        kubeconfig.trim().length > 0 &&
        ingressHost.trim().length > 0 &&
        hasGatewayTlsKey === hasGatewayTlsCertificate &&
        locationId.length > 0;

    const { items: locations } = useLocations(open);

    const connectCompute = useMutation({
        mutationFn: async () => {
            const gatewayLoadBalancerIpValue = gatewayLoadBalancerIp.trim();
            const gatewayTlsCertificateValue = gatewayTlsCertificate.trim();
            const gatewayTlsKeyValue = gatewayTlsKey.trim();

            return fetchApiJson<ApiComputeRegistry>('/api/computes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    kind: kind.trim(),
                    kubeconfig,
                    ingress_host: ingressHost.trim(),
                    ...(gatewayLoadBalancerIpValue
                        ? { gateway_load_balancer_ip: gatewayLoadBalancerIpValue }
                        : {}),
                    ...(gatewayTlsCertificateValue && gatewayTlsKeyValue
                        ? {
                              gateway_tls_certificate: gatewayTlsCertificateValue,
                              gateway_tls_key: gatewayTlsKeyValue,
                          }
                        : {}),
                    location_id: locationId,
                }),
            });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: computesQueryKey() });
            setOpen(false);
            resetDialogState();
        },
    });

    if (role !== 'administrator') {
        return null;
    }

    return (
        <RegistryDialogShell
            title={t('dialogs.connectComputeTitle')}
            description={t('dialogs.connectComputeDescription')}
            open={open}
            error={error}
            canSubmit={canSubmit}
            isPending={connectCompute.isPending}
            pendingLabel={t('actions.connecting')}
            onOpenChange={(nextOpen) => {
                setOpen(nextOpen);
                if (!nextOpen) {
                    resetDialogState();
                }
            }}
            onSubmit={async () => {
                setError(null);
                try {
                    await connectCompute.mutateAsync();
                } catch (mutationError) {
                    setError(
                        mutationError instanceof Error ? mutationError.message : t('dialogs.failedConnectCompute')
                    );
                }
            }}
        >
            <div className="space-y-2">
                <Label htmlFor="compute-kind">{t('labels.kind')}</Label>
                <Select value={kind} onValueChange={(value) => setKind(value ?? '')}>
                    <SelectTrigger id="compute-kind" className="w-full">
                        <SelectValue placeholder={t('dialogs.chooseComputeKind')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="kubernetes">Kubernetes</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="compute-kubeconfig">{t('labels.kubeconfig')}</Label>
                <Textarea
                    id="compute-kubeconfig"
                    value={kubeconfig}
                    onChange={(event) => setKubeconfig(event.target.value)}
                    placeholder="Paste the kubeconfig file contents"
                    className="min-h-40 max-w-full overflow-auto resize-y [field-sizing:fixed]"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="compute-ingress-host">{t('labels.ingressHost')}</Label>
                <Input
                    id="compute-ingress-host"
                    value={ingressHost}
                    onChange={(event) => setIngressHost(event.target.value)}
                    placeholder="apps.example.com"
                    autoComplete="off"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="compute-gateway-load-balancer-ip">{t('labels.gatewayLoadBalancerIp')}</Label>
                <Input
                    id="compute-gateway-load-balancer-ip"
                    value={gatewayLoadBalancerIp}
                    onChange={(event) => setGatewayLoadBalancerIp(event.target.value)}
                    placeholder="203.0.113.10"
                    autoComplete="off"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="compute-gateway-tls-certificate">{t('labels.gatewayTlsCertificate')}</Label>
                <Textarea
                    id="compute-gateway-tls-certificate"
                    value={gatewayTlsCertificate}
                    onChange={(event) => setGatewayTlsCertificate(event.target.value)}
                    placeholder="-----BEGIN CERTIFICATE-----"
                    className="min-h-28 max-w-full overflow-auto resize-y [field-sizing:fixed]"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="compute-gateway-tls-key">{t('labels.gatewayTlsKey')}</Label>
                <Textarea
                    id="compute-gateway-tls-key"
                    value={gatewayTlsKey}
                    onChange={(event) => setGatewayTlsKey(event.target.value)}
                    placeholder="-----BEGIN PRIVATE KEY-----"
                    className="min-h-28 max-w-full overflow-auto resize-y [field-sizing:fixed]"
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
