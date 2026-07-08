import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { RegistryDialogShell, RegistryLocationField } from '@/components/dialogs/RegistryDialogElements';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useLocations } from '@/data/admin';
import { useUserProfile } from '@/hooks/use-user';
import { apiComputeRegistrySchema, parseApiResponse } from '@/lib/api-schemas';
import { fetchApiJson } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { computesQueryKey } from '@/lib/query-keys';
import type { ApiComputeRegistry } from '@/lib/types';

const computeConnectionSchema = z
    .object({
        kind: z.literal('kubernetes'),
        kubeconfig: z.string().refine((value) => value.trim().length > 0),
        ingressHost: z.string().trim().min(1),
        gatewayLoadBalancerIp: z.string().trim(),
        gatewayTlsCertificate: z.string().trim(),
        gatewayTlsKey: z.string().trim(),
        locationId: z.string().min(1),
    })
    .refine((value) => Boolean(value.gatewayTlsKey) === Boolean(value.gatewayTlsCertificate), {
        path: ['gatewayTlsKey'],
    });

type ComputeConnectionInput = z.input<typeof computeConnectionSchema>;
type ComputeConnectionValues = z.output<typeof computeConnectionSchema>;

const defaultComputeConnectionValues = {
    kind: 'kubernetes',
    kubeconfig: '',
    ingressHost: '',
    gatewayLoadBalancerIp: '',
    gatewayTlsCertificate: '',
    gatewayTlsKey: '',
    locationId: '',
} satisfies ComputeConnectionInput;

/** Renders the admin compute connect dialog. */
export default function ConnectComputeDialog() {
    const { t } = useTranslation();
    const { role } = useUserProfile();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const form = useForm<ComputeConnectionInput, unknown, ComputeConnectionValues>({
        defaultValues: defaultComputeConnectionValues,
        mode: 'onChange',
        resolver: zodResolver(computeConnectionSchema),
    });
    const values = form.watch();

    /** Clears sensitive compute connection form state. */
    function resetDialogState() {
        form.reset(defaultComputeConnectionValues);
        setError(null);
    }

    const { items: locations } = useLocations(open);

    const connectCompute = useMutation({
        mutationFn: async (payload: ComputeConnectionValues) => {
            return fetchApiJson<ApiComputeRegistry>(
                '/api/computes',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        kind: payload.kind,
                        kubeconfig: payload.kubeconfig,
                        ingress_host: payload.ingressHost,
                        ...(payload.gatewayLoadBalancerIp
                            ? { gateway_load_balancer_ip: payload.gatewayLoadBalancerIp }
                            : {}),
                        ...(payload.gatewayTlsCertificate && payload.gatewayTlsKey
                            ? {
                                  gateway_tls_certificate: payload.gatewayTlsCertificate,
                                  gateway_tls_key: payload.gatewayTlsKey,
                              }
                            : {}),
                        location_id: payload.locationId,
                    }),
                },
                (value) => parseApiResponse(apiComputeRegistrySchema, value)
            );
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
            canSubmit={open && form.formState.isValid}
            isPending={connectCompute.isPending}
            pendingLabel={t('actions.connecting')}
            onOpenChange={(nextOpen) => {
                setOpen(nextOpen);
                if (!nextOpen) {
                    resetDialogState();
                }
            }}
            onSubmit={form.handleSubmit(async (payload) => {
                setError(null);
                try {
                    await connectCompute.mutateAsync(payload);
                } catch (mutationError) {
                    setError(
                        mutationError instanceof Error ? mutationError.message : t('dialogs.failedConnectCompute')
                    );
                }
            })}
        >
            <div className="space-y-2">
                <Label htmlFor="compute-kind">{t('labels.kind')}</Label>
                <Select
                    value={values.kind}
                    onValueChange={(value) =>
                        form.setValue('kind', value === 'kubernetes' ? value : 'kubernetes', { shouldValidate: true })
                    }
                >
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
                    {...form.register('kubeconfig')}
                    placeholder="Paste the kubeconfig file contents"
                    className="min-h-40 max-w-full overflow-auto resize-y [field-sizing:fixed]"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="compute-ingress-host">{t('labels.ingressHost')}</Label>
                <Input
                    id="compute-ingress-host"
                    {...form.register('ingressHost')}
                    placeholder="apps.example.com"
                    autoComplete="off"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="compute-gateway-load-balancer-ip">{t('labels.gatewayLoadBalancerIp')}</Label>
                <Input
                    id="compute-gateway-load-balancer-ip"
                    {...form.register('gatewayLoadBalancerIp')}
                    placeholder="203.0.113.10"
                    autoComplete="off"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="compute-gateway-tls-certificate">{t('labels.gatewayTlsCertificate')}</Label>
                <Textarea
                    id="compute-gateway-tls-certificate"
                    {...form.register('gatewayTlsCertificate')}
                    placeholder="-----BEGIN CERTIFICATE-----"
                    className="min-h-28 max-w-full overflow-auto resize-y [field-sizing:fixed]"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="compute-gateway-tls-key">{t('labels.gatewayTlsKey')}</Label>
                <Textarea
                    id="compute-gateway-tls-key"
                    {...form.register('gatewayTlsKey')}
                    placeholder="-----BEGIN PRIVATE KEY-----"
                    className="min-h-28 max-w-full overflow-auto resize-y [field-sizing:fixed]"
                />
            </div>

            <RegistryLocationField
                id="compute-location"
                value={values.locationId}
                locations={locations}
                onValueChange={(value) => form.setValue('locationId', value, { shouldValidate: true })}
            />
        </RegistryDialogShell>
    );
}
