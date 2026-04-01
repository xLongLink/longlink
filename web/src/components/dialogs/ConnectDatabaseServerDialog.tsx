import { PlusCircle } from 'lucide-react';
import { Button } from '@/ui/button';
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/ui/dialog';
import { Input } from '@/ui/input';

type ConnectDatabaseServerDialogProps = {
    serverName: string;
    host: string;
    port: string;
    username: string;
    password: string;
    canConnect: boolean;
    onServerNameChange: (value: string) => void;
    onHostChange: (value: string) => void;
    onPortChange: (value: string) => void;
    onUsernameChange: (value: string) => void;
    onPasswordChange: (value: string) => void;
    onConnect: () => void;
};

export default function ConnectDatabaseServerDialog({
    serverName,
    host,
    port,
    username,
    password,
    canConnect,
    onServerNameChange,
    onHostChange,
    onPortChange,
    onUsernameChange,
    onPasswordChange,
    onConnect,
}: ConnectDatabaseServerDialogProps) {
    return (
        <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
                <DialogTitle>Connect database server</DialogTitle>
                <DialogDescription>
                    Register a top-level database server. New applications will create a dedicated database/name on this
                    server.
                </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 md:grid-cols-2">
                <Input
                    placeholder="Server name"
                    value={serverName}
                    onChange={(event) => onServerNameChange(event.target.value)}
                />
                <Input placeholder="Host" value={host} onChange={(event) => onHostChange(event.target.value)} />
                <Input placeholder="Port" value={port} onChange={(event) => onPortChange(event.target.value)} />
                <Input
                    placeholder="Username"
                    value={username}
                    onChange={(event) => onUsernameChange(event.target.value)}
                />
                <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(event) => onPasswordChange(event.target.value)}
                    className="md:col-span-2"
                />
            </div>

            <div className="flex justify-end">
                <Button variant="outline" onClick={onConnect} disabled={!canConnect}>
                    <PlusCircle className="h-4 w-4" />
                    Connect
                </Button>
            </div>
        </DialogContent>
    );
}
