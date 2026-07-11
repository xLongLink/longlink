import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { RegistryLocationField, RegistryShell } from '@/components/dialogs/RegistryElements';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLocations } from '@/data/admin';
import { useUserProfile } from '@/hooks/use-user';
import { apiComputeRegistrySchema, parseApiResponse } from '@/lib/api-schemas';
import { fetchApiJson } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { computesQueryKey } from '@/lib/query-keys';
import type { ApiComputeRegistry } from '@/lib/types';

const computeConnectionSchema = z.object({
    kubeconfig: z.string().refine((value) => value.trim().length > 0),
    ingressHost: z.string().trim().min(1),
    locationId: z.string().min(1),
});

type ComputeConnectionInput = z.input<typeof computeConnectionSchema>;
type ComputeConnectionValues = z.output<typeof computeConnectionSchema>;

const defaultComputeConnectionValues = {
    kubeconfig: '',
    ingressHost: '',
    locationId: '',
} satisfies ComputeConnectionInput;

/** Renders the admin compute connect dialog. */
export default function ConnectCompute() {
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
                        kubeconfig: payload.kubeconfig,
                        ingress_host: payload.ingressHost,
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

    // Restrict registry changes to administrators.
    if (role !== 'administrator') {
        return null;
    }

    return (
        <RegistryShell
            title={t('dialogs.connectComputeTitle')}
            description={t('dialogs.connectComputeDescription')}
            open={open}
            error={error}
            canSubmit={open && form.formState.isValid}
            isPending={connectCompute.isPending}
            pendingLabel={t('actions.connecting')}
            onOpenChange={(nextOpen) => {
                setOpen(nextOpen);
                // Clear sensitive form state when the dialog closes.
                if (!nextOpen) {
                    resetDialogState();
                }
            }}
            onSubmit={form.handleSubmit(async (payload) => {
                setError(null);
                // Submit the registry connection.
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
                    placeholder="https://apps.example.com"
                    autoComplete="off"
                />
            </div>

            <RegistryLocationField
                id="compute-location"
                value={values.locationId}
                locations={locations}
                onValueChange={(value) => form.setValue('locationId', value, { shouldValidate: true })}
            />
        </RegistryShell>
    );
}
