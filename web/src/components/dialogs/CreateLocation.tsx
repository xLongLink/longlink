import { z } from 'zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiQueryKey } from '@/lib/api';
import { fetchApiJson } from '@/lib/api';
import { useCountries } from '@/data/admin';
import { useTranslation } from '@/lib/i18n';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useUserProfile } from '@/hooks/use-user';
import { Textarea } from '@/components/ui/textarea';
import { apiLocationMutationResponseSchema, parseApiResponse } from '@/lib/api-schemas';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { computesQueryKey, databasesQueryKey, locationsQueryKey, storagesQueryKey } from '@/lib/query-keys';

const createLocationSchema = z.object({
    name: z.string().trim().min(1),
    country: z.string().length(2),
    kubeconfig: z.string().refine((value) => value.trim().length > 0),
    databaseKind: z.literal('postgresql'),
    databaseHost: z.string().trim().min(1),
    databasePort: z.coerce.number().int().min(1).max(65535),
    databaseUsername: z.string().trim().min(1),
    databasePassword: z.string().min(1),
    storageKind: z.enum(['minio', 'exoscale']),
    storageEndpointUrl: z.string().trim().url(),
    storageRuntimeEndpointUrl: z.union([z.literal(''), z.string().trim().url()]),
    storageAccessKeyId: z.string().trim().min(1),
    storageSecretAccessKey: z.string().min(1),
});

type CreateLocationInput = z.input<typeof createLocationSchema>;
type CreateLocationValues = z.output<typeof createLocationSchema>;

const defaultCreateLocationValues = {
    name: '',
    country: 'CH',
    kubeconfig: '',
    databaseKind: 'postgresql',
    databaseHost: '',
    databasePort: '5432',
    databaseUsername: '',
    databasePassword: '',
    storageKind: 'minio',
    storageEndpointUrl: '',
    storageRuntimeEndpointUrl: '',
    storageAccessKeyId: '',
    storageSecretAccessKey: '',
} satisfies CreateLocationInput;

/** Renders the admin create location dialog. */
export default function CreateLocation() {
    const { t } = useTranslation();
    const { role } = useUserProfile();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const form = useForm<CreateLocationInput, unknown, CreateLocationValues>({
        defaultValues: defaultCreateLocationValues,
        mode: 'onChange',
        resolver: zodResolver(createLocationSchema),
    });
    const country = useWatch({ control: form.control, name: 'country' });
    const databaseKind = useWatch({ control: form.control, name: 'databaseKind' });
    const storageKind = useWatch({ control: form.control, name: 'storageKind' });
    const storageEndpointUrl = useWatch({ control: form.control, name: 'storageEndpointUrl' });
    const { items: countryOptions } = useCountries(open);

    const createLocation = useMutation({
        mutationFn: async (payload: CreateLocationValues) => {
            return fetchApiJson(
                '/api/locations',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: payload.name,
                        country: payload.country,
                        compute: {
                            kubeconfig: payload.kubeconfig,
                        },
                        database: {
                            kind: payload.databaseKind,
                            host: payload.databaseHost,
                            port: payload.databasePort,
                            username: payload.databaseUsername,
                            password: payload.databasePassword,
                        },
                        storage: {
                            kind: payload.storageKind,
                            endpoint_url: payload.storageEndpointUrl,
                            runtime_endpoint_url: payload.storageRuntimeEndpointUrl || null,
                            access_key_id: payload.storageAccessKeyId,
                            secret_access_key: payload.storageSecretAccessKey,
                        },
                    }),
                },
                (value) => parseApiResponse(apiLocationMutationResponseSchema, value)
            );
        },
        onSuccess: async () => {
            // Refresh every diagnostic owned by the location aggregate.
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: locationsQueryKey() }),
                queryClient.invalidateQueries({ queryKey: computesQueryKey() }),
                queryClient.invalidateQueries({ queryKey: databasesQueryKey() }),
                queryClient.invalidateQueries({ queryKey: storagesQueryKey() }),
                queryClient.invalidateQueries({ queryKey: apiQueryKey('/api/operations') }),
            ]);
            setOpen(false);
            resetDialogState();
        },
    });

    // Restrict location creation to administrators.
    if (role !== 'administrator') {
        return null;
    }

    /** Clears the location creation form state. */
    function resetDialogState() {
        form.reset(defaultCreateLocationValues);
        setError(null);
    }

    return (
        <>
            <Button type="button" onClick={() => setOpen(true)}>
                {t('actions.create')}
            </Button>

            <Dialog
                open={open}
                onOpenChange={(nextOpen) => {
                    setOpen(nextOpen);
                    // Clear form state when the dialog closes.
                    if (!nextOpen) {
                        resetDialogState();
                    }
                }}
            >
                <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <DialogTitle>{t('dialogs.createLocationTitle')}</DialogTitle>
                            <DialogDescription>{t('dialogs.createLocationDescription')}</DialogDescription>
                        </div>

                        <form
                            className="space-y-4"
                            onSubmit={form.handleSubmit(async (payload) => {
                                setError(null);

                                // Submit the location and let success handlers close the dialog.
                                try {
                                    await createLocation.mutateAsync(payload);
                                } catch (mutationError) {
                                    setError(
                                        mutationError instanceof Error
                                            ? mutationError.message
                                            : t('dialogs.createLocationFailed')
                                    );
                                }
                            })}
                        >
                            <div className="space-y-2">
                                <Label htmlFor="location-name">{t('labels.name')}</Label>
                                <Input
                                    id="location-name"
                                    {...form.register('name')}
                                    placeholder="US East (N. Virginia)"
                                    autoComplete="off"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="location-country">{t('labels.country')}</Label>
                                <Select
                                    value={country}
                                    onValueChange={(value) =>
                                        form.setValue('country', value ?? '', { shouldValidate: true })
                                    }
                                >
                                    <SelectTrigger id="location-country" className="w-full">
                                        <SelectValue placeholder={t('dialogs.chooseCountry')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {countryOptions.map((countryOption) => (
                                            <SelectItem key={countryOption.code} value={countryOption.code}>
                                                {countryOption.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-3 border-t border-border pt-4">
                                <div>
                                    <h3 className="font-medium">Compute</h3>
                                    <p className="text-xs text-muted-foreground">
                                        Kubernetes connection configuration.
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="location-kubeconfig">{t('labels.kubeconfig')}</Label>
                                    <Textarea
                                        id="location-kubeconfig"
                                        {...form.register('kubeconfig')}
                                        placeholder="Paste the kubeconfig file contents"
                                        className="min-h-40 max-w-full resize-y overflow-auto font-mono text-xs [field-sizing:fixed]"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3 border-t border-border pt-4">
                                <div>
                                    <h3 className="font-medium">Database</h3>
                                    <p className="text-xs text-muted-foreground">
                                        PostgreSQL connection used by this location.
                                    </p>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="location-database-kind">{t('labels.kind')}</Label>
                                        <Select value={databaseKind} disabled>
                                            <SelectTrigger id="location-database-kind" className="w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="postgresql">PostgreSQL</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="location-database-host">{t('labels.host')}</Label>
                                        <Input
                                            id="location-database-host"
                                            {...form.register('databaseHost')}
                                            placeholder="postgres.example.internal"
                                            autoComplete="off"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="location-database-port">{t('labels.port')}</Label>
                                        <Input
                                            id="location-database-port"
                                            type="number"
                                            {...form.register('databasePort')}
                                            placeholder="5432"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="location-database-username">{t('labels.username')}</Label>
                                        <Input
                                            id="location-database-username"
                                            {...form.register('databaseUsername')}
                                            autoComplete="off"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="location-database-password">{t('labels.password')}</Label>
                                    <Input
                                        id="location-database-password"
                                        type="password"
                                        {...form.register('databasePassword')}
                                        autoComplete="new-password"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3 border-t border-border pt-4">
                                <div>
                                    <h3 className="font-medium">Storage</h3>
                                    <p className="text-xs text-muted-foreground">
                                        Object storage connection used by this location.
                                    </p>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="location-storage-kind">{t('labels.kind')}</Label>
                                        <Select
                                            value={storageKind}
                                            onValueChange={(value) => {
                                                if (value === 'minio' || value === 'exoscale') {
                                                    form.setValue('storageKind', value, { shouldValidate: true });
                                                }
                                            }}
                                        >
                                            <SelectTrigger id="location-storage-kind" className="w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="minio">MinIO</SelectItem>
                                                <SelectItem value="exoscale">Exoscale SOS</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="location-storage-access-key">{t('labels.accessKeyId')}</Label>
                                        <Input
                                            id="location-storage-access-key"
                                            {...form.register('storageAccessKeyId')}
                                            autoComplete="off"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="location-storage-endpoint">{t('labels.endpointUrl')}</Label>
                                    <Input
                                        id="location-storage-endpoint"
                                        {...form.register('storageEndpointUrl')}
                                        placeholder={
                                            storageKind === 'exoscale'
                                                ? 'https://sos-ch-dk-2.exo.io'
                                                : 'http://localhost:19000'
                                        }
                                        autoComplete="off"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="location-storage-runtime-endpoint">
                                        {t('labels.runtimeEndpointUrl')} ({t('dialogs.optional')})
                                    </Label>
                                    <Input
                                        id="location-storage-runtime-endpoint"
                                        {...form.register('storageRuntimeEndpointUrl')}
                                        placeholder={storageEndpointUrl || 'http://minio.storage.svc:9000'}
                                        autoComplete="off"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="location-storage-secret-key">{t('labels.secretAccessKey')}</Label>
                                    <Input
                                        id="location-storage-secret-key"
                                        type="password"
                                        {...form.register('storageSecretAccessKey')}
                                        autoComplete="new-password"
                                    />
                                </div>
                            </div>

                            {error ? <p className="text-sm text-destructive">{error}</p> : null}

                            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setOpen(false);
                                        resetDialogState();
                                    }}
                                >
                                    {t('actions.cancel')}
                                </Button>
                                <Button type="submit" disabled={createLocation.isPending || !form.formState.isValid}>
                                    {createLocation.isPending ? t('actions.creating') : t('actions.create')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
