import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { RegistryDialogShell, RegistryLocationField } from '@/components/dialogs/RegistryDialogElements';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocations } from '@/hooks/use-locations';
import { useUser } from '@/hooks/use-user';
import { fetchApiJson } from '@/lib/api';
import { databasesQueryKey } from '@/lib/query-keys';

/** Renders the admin database connect dialog. */
export default function ConnectDatabaseDialog() {
    const { role } = useUser();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [kind, setKind] = useState('postgresql');
    const [name, setName] = useState('');
    const [host, setHost] = useState('');
    const [port, setPort] = useState('5432');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [locationId, setLocationId] = useState('');
    const [error, setError] = useState<string | null>(null);
    const { items: locations } = useLocations(open);

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
                    location_id: locationId,
                }),
            });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: databasesQueryKey() });
            setOpen(false);
            setKind('postgresql');
            setName('');
            setHost('');
            setPort('5432');
            setUsername('');
            setPassword('');
            setLocationId('');
        },
    });

    if (role !== 'administrator') {
        return null;
    }

    return (
        <RegistryDialogShell
            title="Connect database"
            description="Register a database backend for the control plane."
            open={open}
            error={error}
            canSubmit={canSubmit}
            isPending={connectDatabase.isPending}
            pendingLabel="Connecting..."
            onOpenChange={(nextOpen) => {
                setOpen(nextOpen);
                if (!nextOpen) setError(null);
            }}
            onSubmit={async () => {
                setError(null);
                try {
                    await connectDatabase.mutateAsync();
                } catch (mutationError) {
                    setError(mutationError instanceof Error ? mutationError.message : 'Failed to connect database');
                }
            }}
        >
            <div className="space-y-2">
                <Label htmlFor="database-kind">Kind</Label>
                <Select value={kind} onValueChange={(value) => setKind(value ?? '')}>
                    <SelectTrigger id="database-kind" className="w-full">
                        <SelectValue placeholder="Choose a database kind" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="postgresql">PostgreSQL</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="database-name">Name</Label>
                <Input
                    id="database-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="primary"
                    autoComplete="off"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="database-host">Host</Label>
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
                    <Label htmlFor="database-port">Port</Label>
                    <Input
                        id="database-port"
                        type="number"
                        value={port}
                        onChange={(event) => setPort(event.target.value)}
                        placeholder="5432"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="database-username">Username</Label>
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
                <Label htmlFor="database-password">Password</Label>
                <Input
                    id="database-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="off"
                />
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
