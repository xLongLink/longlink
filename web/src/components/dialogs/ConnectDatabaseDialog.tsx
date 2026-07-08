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
import { apiDatabaseRegistrySchema, parseApiResponse } from '@/lib/api-schemas';
import { fetchApiJson } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { databasesQueryKey } from '@/lib/query-keys';

const databaseConnectionSchema = z.object({
    kind: z.literal('postgresql'),
    name: z.string().trim().min(1),
    host: z.string().trim().min(1),
    port: z.coerce.number().int().min(1).max(65535),
    username: z.string().trim().min(1),
    password: z.string().min(1),
    runtimeHost: z.string().trim(),
    runtimePort: z.union([z.literal(''), z.coerce.number().int().min(1).max(65535)]),
    locationId: z.string().min(1),
});

type DatabaseConnectionInput = z.input<typeof databaseConnectionSchema>;
type DatabaseConnectionValues = z.output<typeof databaseConnectionSchema>;

const defaultDatabaseConnectionValues = {
    kind: 'postgresql',
    name: '',
    host: '',
    port: '5432',
    username: '',
    password: '',
    runtimeHost: '',
    runtimePort: '',
    locationId: '',
} satisfies DatabaseConnectionInput;

/** Renders the admin database connect dialog. */
export default function ConnectDatabaseDialog() {
    const { t } = useTranslation();
    const { role } = useUserProfile();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { items: locations } = useLocations(open);
    const form = useForm<DatabaseConnectionInput, unknown, DatabaseConnectionValues>({
        defaultValues: defaultDatabaseConnectionValues,
        mode: 'onChange',
        resolver: zodResolver(databaseConnectionSchema),
    });
    const values = form.watch();

    /** Clears sensitive database connection form state. */
    function resetDialogState() {
        form.reset(defaultDatabaseConnectionValues);
        setError(null);
    }

    const connectDatabase = useMutation({
        mutationFn: async (payload: DatabaseConnectionValues) => {
            return fetchApiJson(
                '/api/databases',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        kind: payload.kind,
                        name: payload.name,
                        host: payload.host,
                        port: payload.port,
                        username: payload.username,
                        password: payload.password,
                        runtime_host: payload.runtimeHost || undefined,
                        runtime_port: payload.runtimePort === '' ? undefined : payload.runtimePort,
                        location_id: payload.locationId,
                    }),
                },
                (value) => parseApiResponse(apiDatabaseRegistrySchema, value)
            );
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: databasesQueryKey() });
            setOpen(false);
            resetDialogState();
        },
    });

    if (role !== 'administrator') {
        return null;
    }

    return (
        <RegistryDialogShell
            title={t('dialogs.connectDatabaseTitle')}
            description={t('dialogs.connectDatabaseDescription')}
            open={open}
            error={error}
            canSubmit={form.formState.isValid}
            isPending={connectDatabase.isPending}
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
                    await connectDatabase.mutateAsync(payload);
                } catch (mutationError) {
                    setError(
                        mutationError instanceof Error ? mutationError.message : t('dialogs.failedConnectDatabase')
                    );
                }
            })}
        >
            <div className="space-y-2">
                <Label htmlFor="database-kind">{t('labels.kind')}</Label>
                <Select
                    value={values.kind}
                    onValueChange={(value) =>
                        form.setValue('kind', value === 'postgresql' ? value : 'postgresql', { shouldValidate: true })
                    }
                >
                    <SelectTrigger id="database-kind" className="w-full">
                        <SelectValue placeholder={t('dialogs.chooseDatabaseKind')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="postgresql">PostgreSQL</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="database-name">{t('labels.name')}</Label>
                <Input id="database-name" {...form.register('name')} placeholder="primary" autoComplete="off" />
            </div>

            <div className="space-y-2">
                <Label htmlFor="database-host">{t('labels.host')}</Label>
                <Input
                    id="database-host"
                    {...form.register('host')}
                    placeholder="postgres.example.internal"
                    autoComplete="off"
                />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="database-port">{t('labels.port')}</Label>
                    <Input id="database-port" type="number" {...form.register('port')} placeholder="5432" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="database-username">{t('labels.username')}</Label>
                    <Input
                        id="database-username"
                        {...form.register('username')}
                        placeholder="longlink"
                        autoComplete="off"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="database-password">{t('labels.password')}</Label>
                <Input id="database-password" type="password" {...form.register('password')} autoComplete="off" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="database-runtime-host">{t('labels.runtimeHost')}</Label>
                    <Input
                        id="database-runtime-host"
                        {...form.register('runtimeHost')}
                        placeholder="host.k3d.internal"
                        autoComplete="off"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="database-runtime-port">{t('labels.runtimePort')}</Label>
                    <Input
                        id="database-runtime-port"
                        type="number"
                        {...form.register('runtimePort')}
                        placeholder={String(values.port || '5432')}
                    />
                </div>
            </div>

            <RegistryLocationField
                id="database-location"
                value={values.locationId}
                locations={locations}
                onValueChange={(value) => form.setValue('locationId', value, { shouldValidate: true })}
            />
        </RegistryDialogShell>
    );
}
