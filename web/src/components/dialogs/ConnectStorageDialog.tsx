import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { RegistryDialogShell, RegistryLocationField } from '@/components/dialogs/RegistryDialogElements';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocations } from '@/data/admin';
import { useUserProfile } from '@/hooks/use-user';
import { apiStorageRegistrySchema, parseApiResponse } from '@/lib/api-schemas';
import { fetchApiJson } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { storagesQueryKey } from '@/lib/query-keys';

const storageConnectionSchema = z.object({
    kind: z.literal('s3'),
    name: z.string().trim().min(1),
    protocol: z.enum(['http', 'https']),
    endpointUrl: z.string().trim().url(),
    runtimeEndpointUrl: z.union([z.literal(''), z.string().trim().url()]),
    accessKeyId: z.string().trim().min(1),
    secretAccessKey: z.string().min(1),
    locationId: z.string().min(1),
});

type StorageConnectionInput = z.input<typeof storageConnectionSchema>;
type StorageConnectionValues = z.output<typeof storageConnectionSchema>;

const defaultStorageConnectionValues = {
    kind: 's3',
    name: '',
    protocol: 'https',
    endpointUrl: '',
    runtimeEndpointUrl: '',
    accessKeyId: '',
    secretAccessKey: '',
    locationId: '',
} satisfies StorageConnectionInput;

/** Renders the admin storage connect dialog. */
export default function ConnectStorageDialog() {
    const { t } = useTranslation();
    const { role } = useUserProfile();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const form = useForm<StorageConnectionInput, unknown, StorageConnectionValues>({
        defaultValues: defaultStorageConnectionValues,
        mode: 'onChange',
        resolver: zodResolver(storageConnectionSchema),
    });
    const values = form.watch();

    /** Clears sensitive storage connection form state. */
    function resetDialogState() {
        form.reset(defaultStorageConnectionValues);
        setError(null);
    }

    const { items: locations } = useLocations(open);

    const connectStorage = useMutation({
        mutationFn: async (payload: StorageConnectionValues) => {
            return fetchApiJson(
                '/api/storages',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        kind: payload.kind,
                        name: payload.name,
                        protocol: payload.protocol,
                        endpoint_url: payload.endpointUrl,
                        runtime_endpoint_url: payload.runtimeEndpointUrl || undefined,
                        access_key_id: payload.accessKeyId,
                        secret_access_key: payload.secretAccessKey,
                        location_id: payload.locationId,
                    }),
                },
                (value) => parseApiResponse(apiStorageRegistrySchema, value)
            );
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: storagesQueryKey() });
            setOpen(false);
            resetDialogState();
        },
    });

    if (role !== 'administrator') {
        return null;
    }

    return (
        <RegistryDialogShell
            title={t('dialogs.connectStorageTitle')}
            description={t('dialogs.connectStorageDescription')}
            open={open}
            error={error}
            canSubmit={open && form.formState.isValid}
            isPending={connectStorage.isPending}
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
                    await connectStorage.mutateAsync(payload);
                } catch (mutationError) {
                    setError(
                        mutationError instanceof Error ? mutationError.message : t('dialogs.failedConnectStorage')
                    );
                }
            })}
        >
            <div className="space-y-2">
                <Label htmlFor="storage-kind">{t('labels.kind')}</Label>
                <Select
                    value={values.kind}
                    onValueChange={(value) =>
                        form.setValue('kind', value === 's3' ? value : 's3', { shouldValidate: true })
                    }
                >
                    <SelectTrigger id="storage-kind" className="w-full">
                        <SelectValue placeholder={t('dialogs.chooseStorageKind')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="s3">S3</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="storage-name">{t('labels.name')}</Label>
                <Input id="storage-name" {...form.register('name')} placeholder="assets" autoComplete="off" />
            </div>

            <div className="space-y-2">
                <Label htmlFor="storage-protocol">{t('labels.endpointProtocol')}</Label>
                <Input id="storage-protocol" {...form.register('protocol')} placeholder="https" autoComplete="off" />
            </div>

            <div className="space-y-2">
                <Label htmlFor="storage-endpoint">{t('labels.endpointUrl')}</Label>
                <Input
                    id="storage-endpoint"
                    {...form.register('endpointUrl')}
                    placeholder="https://s3.example.com"
                    autoComplete="off"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="storage-runtime-endpoint">{t('labels.runtimeEndpointUrl')}</Label>
                <Input
                    id="storage-runtime-endpoint"
                    {...form.register('runtimeEndpointUrl')}
                    placeholder={values.endpointUrl || 'https://s3.example.com'}
                    autoComplete="off"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="storage-access-key">{t('labels.accessKeyId')}</Label>
                <Input
                    id="storage-access-key"
                    {...form.register('accessKeyId')}
                    placeholder="AKIA..."
                    autoComplete="off"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="storage-secret-key">{t('labels.secretAccessKey')}</Label>
                <Input
                    id="storage-secret-key"
                    type="password"
                    {...form.register('secretAccessKey')}
                    autoComplete="off"
                />
            </div>

            <RegistryLocationField
                id="storage-location"
                value={values.locationId}
                locations={locations}
                onValueChange={(value) => form.setValue('locationId', value, { shouldValidate: true })}
            />
        </RegistryDialogShell>
    );
}
