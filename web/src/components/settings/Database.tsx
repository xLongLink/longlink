import { DatabaseIcon, PlusCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import Hero from '@/components/longlink/Hero';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

type DatabaseServer = {
    name: string;
    host: string;
    port: string;
    username: string;
    status: 'Connected';
};

export default function Database() {
    const [serverName, setServerName] = useState('');
    const [host, setHost] = useState('');
    const [port, setPort] = useState('5432');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [connectedDatabases, setConnectedDatabases] = useState<
        DatabaseServer[]
    >([]);

    const canConnect = useMemo(() => {
        return (
            serverName.trim().length > 0 &&
            host.trim().length > 0 &&
            port.trim().length > 0 &&
            username.trim().length > 0 &&
            password.trim().length > 0
        );
    }, [host, password, port, serverName, username]);

    const onConnect = () => {
        if (!canConnect) {
            return;
        }

        setConnectedDatabases((current) => [
            {
                name: serverName.trim(),
                host: host.trim(),
                port: port.trim(),
                username: username.trim(),
                status: 'Connected',
            },
            ...current,
        ]);

        setServerName('');
        setHost('');
        setPort('5432');
        setUsername('');
        setPassword('');
    };

    return (
        <div className="space-y-6">
            <Hero
                title="Database Settings"
                subtitle="Configure top level database servers. Each application gets its own database name on a connected server."
                icon="settings"
                action="Connect"
            >
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Connect database server</DialogTitle>
                        <DialogDescription>
                            Register a top-level database server. New
                            applications will create a dedicated database/name
                            on this server.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-3 md:grid-cols-2">
                        <Input
                            placeholder="Server name"
                            value={serverName}
                            onChange={(event) =>
                                setServerName(event.target.value)
                            }
                        />
                        <Input
                            placeholder="Host"
                            value={host}
                            onChange={(event) => setHost(event.target.value)}
                        />
                        <Input
                            placeholder="Port"
                            value={port}
                            onChange={(event) => setPort(event.target.value)}
                        />
                        <Input
                            placeholder="Username"
                            value={username}
                            onChange={(event) =>
                                setUsername(event.target.value)
                            }
                        />
                        <Input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(event) =>
                                setPassword(event.target.value)
                            }
                            className="md:col-span-2"
                        />
                    </div>

                    <div className="flex justify-end">
                        <Button
                            variant="outline"
                            onClick={onConnect}
                            disabled={!canConnect}
                        >
                            <PlusCircle className="h-4 w-4" />
                            Connect
                        </Button>
                    </div>
                </DialogContent>
            </Hero>

            <Card className="overflow-hidden">
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
                                <TableCell
                                    colSpan={5}
                                    className="py-8 text-center text-muted-foreground"
                                >
                                    No connected database servers yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            connectedDatabases.map((database) => (
                                <TableRow
                                    key={`${database.name}-${database.host}-${database.port}`}
                                >
                                    <TableCell className="font-medium">
                                        {database.name}
                                    </TableCell>
                                    <TableCell>{database.host}</TableCell>
                                    <TableCell>{database.port}</TableCell>
                                    <TableCell>{database.username}</TableCell>
                                    <TableCell>{database.status}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            <Card className="border-dashed p-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                    <DatabaseIcon className="mt-0.5 h-4 w-4" />
                    <p>
                        Connected entries represent top-level database servers.
                        Each application will create and use its own database
                        name inside one of these servers.
                    </p>
                </div>
            </Card>
        </div>
    );
}
