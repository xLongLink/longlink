import { z } from 'zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApiJson } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useUserProfile } from '@/hooks/use-user';
import { apiStorageRegistrySchema, parseApiResponse } from '@/lib/api-schemas';
import { infrastructureOptionsQueryKey, storagesQueryKey } from '@/lib/query-keys';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const configurationSchema = z.object({
    name: z.string().trim().min(1),
    endpoint_url: z.string().trim().url(),
    runtime_endpoint_url: z.union([z.literal(''), z.string().trim().url()]),
});

const schema = z.discriminatedUnion('kind', [
    configurationSchema.extend({
        kind: z.literal('minio'),
        access_key_id: z.string().trim().min(1),
        secret_access_key: z.string().min(1),
    }),
    configurationSchema.extend({
        kind: z.literal('exoscale'),
        access_key_id: z.literal(''),
        secret_access_key: z.literal(''),
    }),
]);

type Values = z.infer<typeof schema>;

/** Registers one object-storage backend. */
export default function CreateStorage() {
    const { t } = useTranslation();
    const { role } = useUserProfile();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const form = useForm<Values>({
        defaultValues: {
            name: '',
            kind: 'exoscale',
            endpoint_url: '',
            runtime_endpoint_url: '',
            access_key_id: '',
            secret_access_key: '',
        },
        mode: 'onChange',
        resolver: zodResolver(schema),
    });
    const kind = useWatch({ control: form.control, name: 'kind' });
    const mutation = useMutation({
        mutationFn: async (payload: Values) =>
            fetchApiJson(
                '/api/storages',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...payload,
                        runtime_endpoint_url: payload.runtime_endpoint_url || null,
                        access_key_id: payload.kind === 'minio' ? payload.access_key_id : null,
                        secret_access_key: payload.kind === 'minio' ? payload.secret_access_key : null,
                    }),
                },
                (value) => parseApiResponse(apiStorageRegistrySchema, value)
            ),
        onSuccess: async () => {
            setOpen(false);
            resetDialogState();
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: storagesQueryKey() }),
                queryClient.invalidateQueries({ queryKey: infrastructureOptionsQueryKey() }),
            ]);
        },
    });

    // Only administrators can register infrastructure.
    if (role !== 'administrator') {
        return null;
    }

    /** Clears connection secrets and errors when the dialog closes. */
    function resetDialogState() {
        form.reset();
        setError(null);
    }

    return (
        <>
            <Button type="button" onClick={() => setOpen(true)}>
                {t('dialogs.connectStorageTitle')}
            </Button>
            <Dialog
                open={open}
                onOpenChange={(nextOpen) => {
                    if (!nextOpen && mutation.isPending) {
                        return;
                    }
                    setOpen(nextOpen);
                    if (!nextOpen) {
                        resetDialogState();
                    }
                }}
            >
                <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
                    <DialogTitle>{t('dialogs.connectStorageTitle')}</DialogTitle>
                    <DialogDescription>{t('dialogs.connectStorageDescription')}</DialogDescription>
                    <form
                        className="space-y-4"
                        onSubmit={form.handleSubmit(async (payload) => {
                            setError(null);
                            try {
                                await mutation.mutateAsync(payload);
                            } catch (mutationError) {
                                setError(
                                    mutationError instanceof Error
                                        ? mutationError.message
                                        : t('dialogs.failedConnectStorage')
                                );
                            }
                        })}
                    >
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="storage-name">{t('labels.name')}</Label>
                                <Input id="storage-name" {...form.register('name')} autoComplete="off" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="storage-kind">{t('labels.kind')}</Label>
                                <Select
                                    value={kind}
                                    onValueChange={(value) => {
                                        if (value === 'minio' || value === 'exoscale') {
                                            form.setValue('kind', value, { shouldValidate: true });

                                            // Remove local credentials when switching to Platform-managed Exoscale.
                                            if (value === 'exoscale') {
                                                form.setValue('access_key_id', '', { shouldValidate: true });
                                                form.setValue('secret_access_key', '', { shouldValidate: true });
                                            }
                                        }
                                    }}
                                >
                                    <SelectTrigger id="storage-kind" className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="exoscale">Exoscale SOS</SelectItem>
                                        <SelectItem value="minio">MinIO</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="storage-endpoint">{t('labels.endpointUrl')}</Label>
                            <Input
                                id="storage-endpoint"
                                {...form.register('endpoint_url')}
                                placeholder={
                                    kind === 'exoscale' ? 'https://sos-ch-dk-2.exo.io' : 'http://localhost:19000'
                                }
                                autoComplete="off"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="storage-runtime-endpoint">
                                {t('labels.runtimeEndpointUrl')} ({t('dialogs.optional')})
                            </Label>
                            <Input
                                id="storage-runtime-endpoint"
                                {...form.register('runtime_endpoint_url')}
                                autoComplete="off"
                            />
                        </div>
                        {kind === 'minio' ? (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="storage-access-key">{t('labels.accessKeyId')}</Label>
                                    <Input
                                        id="storage-access-key"
                                        {...form.register('access_key_id')}
                                        autoComplete="off"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="storage-secret-key">{t('labels.secretAccessKey')}</Label>
                                    <Input
                                        id="storage-secret-key"
                                        type="password"
                                        {...form.register('secret_access_key')}
                                        autoComplete="new-password"
                                    />
                                </div>
                            </>
                        ) : null}
                        {error ? <p className="text-sm text-destructive">{error}</p> : null}
                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={mutation.isPending}
                                onClick={() => {
                                    setOpen(false);
                                    resetDialogState();
                                }}
                            >
                                {t('actions.cancel')}
                            </Button>
                            <Button type="submit" disabled={mutation.isPending || !form.formState.isValid}>
                                {mutation.isPending ? t('actions.creating') : t('actions.create')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
