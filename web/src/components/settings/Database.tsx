import { useEffect, useMemo, useState } from 'react';
import { ConnectDatabaseServerDialog } from '@/components/dialogs';
import Hero from '@/longlink/Hero';
import { apiFetch } from '@/lib/api';
import { Card } from '@/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';

type DatabaseServer = {
    name: string;
    host: string;
    port: number;
    username: string;
    maintenance_database: string;
};

type DatabaseConnectionCreate = {
    name: string;
    host: string;
    port: number;
    username: string;
    password: string;
    maintenance_database: string;
};

export default function Database() {
    const [serverName, setServerName] = useState('');
    const [host, setHost] = useState('');
    const [port, setPort] = useState('5432');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [connectedDatabases, setConnectedDatabases] = useState<DatabaseServer[]>([]);

    const canConnect = useMemo(() => {
        return (
            serverName.trim().length > 0 &&
            host.trim().length > 0 &&
            port.trim().length > 0 &&
            username.trim().length > 0 &&
            password.trim().length > 0
        );
    }, [host, password, port, serverName, username]);

    const resetForm = () => {
        setServerName('');
        setHost('');
        setPort('5432');
        setUsername('');
        setPassword('');
    };

    useEffect(() => {
        const loadDatabaseConnections = async () => {
            try {
                const connections = await apiFetch<DatabaseServer[]>('/databases');
                setConnectedDatabases(connections);
            } catch {
                setConnectedDatabases([]);
            }
        };

        void loadDatabaseConnections();
    }, []);

    const onConnect = async () => {
        if (!canConnect) {
            return;
        }

        const parsedPort = Number.parseInt(port.trim(), 10);

        if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
            return;
        }

        const payload: DatabaseConnectionCreate = {
            name: serverName.trim(),
            host: host.trim(),
            port: parsedPort,
            username: username.trim(),
            password: password.trim(),
            maintenance_database: 'postgres',
        };

        const connection = await apiFetch<DatabaseServer>('/databases', {
            method: 'POST',
            body: payload,
        });

        setConnectedDatabases((current) => {
            const next = current.filter((database) => database.name !== connection.name);
            return [connection, ...next];
        });

        resetForm();
    };

    return (
        <div className="space-y-6">
            <Hero title="Database Settings" subtitle="Connect a database instance." icon="settings" action="Connect">
                <ConnectDatabaseServerDialog
                    serverName={serverName}
                    host={host}
                    port={port}
                    username={username}
                    password={password}
                    canConnect={canConnect}
                    onServerNameChange={setServerName}
                    onHostChange={setHost}
                    onPortChange={setPort}
                    onUsernameChange={setUsername}
                    onPasswordChange={setPassword}
                    onConnect={() => {
                        void onConnect();
                    }}
                />
            </Hero>

            <Card className="gap-0 overflow-hidden py-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Server</TableHead>
                            <TableHead>Host</TableHead>
                            <TableHead>Port</TableHead>
                            <TableHead>Username</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {connectedDatabases.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                                    No connected database servers yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            connectedDatabases.map((database) => (
                                <TableRow key={`${database.name}-${database.host}-${database.port}`}>
                                    <TableCell className="font-medium">{database.name}</TableCell>
                                    <TableCell>{database.host}</TableCell>
                                    <TableCell>{database.port}</TableCell>
                                    <TableCell>{database.username}</TableCell>
                                    <TableCell>Connected</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
