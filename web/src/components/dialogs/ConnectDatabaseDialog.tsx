import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiUrl, fetchApiJson } from '@/lib/api';

/** Renders the admin database connect dialog. */
export default function ConnectDatabaseDialog() {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [kind, setKind] = useState('postgre');
    const [name, setName] = useState('');
    const [host, setHost] = useState('');
    const [port, setPort] = useState('5432');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [sslmode, setSslmode] = useState('');
    const [maintenanceDatabase, setMaintenanceDatabase] = useState('postgres');
    const [error, setError] = useState<string | null>(null);

    const databaseUrl = apiUrl('/api/database');

    const connectDatabase = useMutation({
        mutationFn: async () => {
            return fetchApiJson(databaseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    kind: kind.trim(),
                    name: name.trim(),
                    host: host.trim(),
                    port: Number(port),
                    username: username.trim(),
                    password,
                    sslmode: sslmode.trim() || null,
                    maintenance_database: maintenanceDatabase.trim() || 'postgres',
                }),
            });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['api', databaseUrl] });
            setOpen(false);
            setKind('postgre');
            setName('');
            setHost('');
            setPort('5432');
            setUsername('');
            setPassword('');
            setSslmode('');
            setMaintenanceDatabase('postgres');
        },
    });

    return (
        <>
            <Button type="button" onClick={() => setOpen(true)}>
                Connect
            </Button>

            <Dialog
                open={open}
                onOpenChange={(nextOpen) => {
                    setOpen(nextOpen);
                    if (!nextOpen) {
                        setError(null);
                    }
                }}
            >
                <DialogContent>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <DialogTitle>Connect database</DialogTitle>
                            <DialogDescription>Register a database backend for the control plane.</DialogDescription>
                        </div>

                        <form
                            className="space-y-4"
                            onSubmit={async (event) => {
                                event.preventDefault();
                                setError(null);

                                // Submit the registry and close the dialog on success.
                                try {
                                    await connectDatabase.mutateAsync();
                                } catch (mutationError) {
                                    setError(
                                        mutationError instanceof Error ? mutationError.message : 'Failed to connect database'
                                    );
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
                                        <SelectItem value="postgre">Postgre</SelectItem>
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

                            <div className="space-y-2">
                                <Label htmlFor="database-sslmode">SSL mode</Label>
                                <Input
                                    id="database-sslmode"
                                    value={sslmode}
                                    onChange={(event) => setSslmode(event.target.value)}
                                    placeholder="prefer"
                                    autoComplete="off"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="database-maintenance">Maintenance database</Label>
                                <Input
                                    id="database-maintenance"
                                    value={maintenanceDatabase}
                                    onChange={(event) => setMaintenanceDatabase(event.target.value)}
                                    placeholder="postgres"
                                    autoComplete="off"
                                />
                            </div>

                            {error ? <p className="text-sm text-destructive">{error}</p> : null}

                            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setOpen(false);
                                        setError(null);
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={connectDatabase.isPending}>
                                    {connectDatabase.isPending ? 'Connecting...' : 'Connect'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
