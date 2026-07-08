import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { RegistryDialogShell, RegistryLocationField } from '@/components/dialogs/RegistryDialogElements';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocations } from '@/data/admin';
import { useUserProfile } from '@/hooks/use-user';
import { fetchApiJson } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { databasesQueryKey } from '@/lib/query-keys';

/** Renders the admin database connect dialog. */
export default function ConnectDatabaseDialog() {
    const { t } = useTranslation();
    const { role } = useUserProfile();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [kind, setKind] = useState('postgresql');
    const [name, setName] = useState('');
    const [host, setHost] = useState('');
    const [port, setPort] = useState('5432');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [runtimeHost, setRuntimeHost] = useState('');
    const [runtimePort, setRuntimePort] = useState('');
    const [locationId, setLocationId] = useState('');
    const [error, setError] = useState<string | null>(null);
    const { items: locations } = useLocations(open);

    /** Clears sensitive database connection form state. */
    function resetDialogState() {
        setKind('postgresql');
        setName('');
        setHost('');
        setPort('5432');
        setUsername('');
        setPassword('');
        setRuntimeHost('');
        setRuntimePort('');
        setLocationId('');
        setError(null);
    }

    const canSubmit =
        kind.trim().length > 0 &&
        name.trim().length > 0 &&
        host.trim().length > 0 &&
        port.length > 0 &&
        username.trim().length > 0 &&
        password.length > 0 &&
        locationId.length > 0;

    const connectDatabase = useMutation({
        mutationFn: async () => {
            return fetchApiJson('/api/databases', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    kind: kind.trim(),
                    name: name.trim(),
                    host: host.trim(),
                    port: Number(port),
                    username: username.trim(),
                    password,
                    runtime_host: runtimeHost.trim() || undefined,
                    runtime_port: runtimePort.length > 0 ? Number(runtimePort) : undefined,
                    location_id: locationId,
                }),
            });
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
            canSubmit={canSubmit}
            isPending={connectDatabase.isPending}
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
                    await connectDatabase.mutateAsync();
                } catch (mutationError) {
                    setError(
                        mutationError instanceof Error ? mutationError.message : t('dialogs.failedConnectDatabase')
                    );
                }
            }}
        >
            <div className="space-y-2">
                <Label htmlFor="database-kind">{t('labels.kind')}</Label>
                <Select value={kind} onValueChange={(value) => setKind(value ?? '')}>
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
                <Input
                    id="database-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="primary"
                    autoComplete="off"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="database-host">{t('labels.host')}</Label>
                <Input
                    id="database-host"
                    value={host}
                    onChange={(event) => setHost(event.target.value)}
                    placeholder="postgres.example.internal"
                    autoComplete="off"
                />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="database-port">{t('labels.port')}</Label>
                    <Input
                        id="database-port"
                        type="number"
                        value={port}
                        onChange={(event) => setPort(event.target.value)}
                        placeholder="5432"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="database-username">{t('labels.username')}</Label>
                    <Input
                        id="database-username"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        placeholder="longlink"
                        autoComplete="off"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="database-password">{t('labels.password')}</Label>
                <Input
                    id="database-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="off"
                />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="database-runtime-host">{t('labels.runtimeHost')}</Label>
                    <Input
                        id="database-runtime-host"
                        value={runtimeHost}
                        onChange={(event) => setRuntimeHost(event.target.value)}
                        placeholder="host.k3d.internal"
                        autoComplete="off"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="database-runtime-port">{t('labels.runtimePort')}</Label>
                    <Input
                        id="database-runtime-port"
                        type="number"
                        value={runtimePort}
                        onChange={(event) => setRuntimePort(event.target.value)}
                        placeholder={port || '5432'}
                    />
                </div>
            </div>

            <RegistryLocationField
                id="database-location"
                value={locationId}
                locations={locations}
                onValueChange={setLocationId}
            />
        </RegistryDialogShell>
    );
}
