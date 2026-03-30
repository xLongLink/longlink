import { useEffect, useMemo, useState } from 'react';
import {
    ConnectApplicationDialog,
    CreateApplicationDialog,
} from '@/components/dialogs';
import { apiFetch } from '@/lib/api';
import AppButton from '@/longlink/Button';
import Hero from '@/longlink/Hero';
import { Card } from '@/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/ui/table';

type Application = {
    id: number;
    name: string;
    url: string;
};

export default function Applications() {
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [owner, setOwner] = useState('');
    const [runtime, setRuntime] = useState('Python SDK');
    const [applications, setApplications] = useState<Application[]>([]);

    const [connectUrl, setConnectUrl] = useState('');
    const [connectToken, setConnectToken] = useState('');
    const [connectError, setConnectError] = useState<string | null>(null);
    const [isConnectPending, setIsConnectPending] = useState(false);

    const canCreate = useMemo(() => {
        return (
            name.trim().length > 0 &&
            slug.trim().length > 0 &&
            owner.trim().length > 0 &&
            runtime.trim().length > 0
        );
    }, [name, owner, runtime, slug]);

    const canConnect = useMemo(() => {
        return connectUrl.trim().length > 0 && connectToken.trim().length > 0;
    }, [connectToken, connectUrl]);

    const loadApps = async () => {
        const response = await apiFetch<Application[]>('/apps');
        setApplications(response);
    };

    useEffect(() => {
        void loadApps();
    }, []);

    const onCreate = () => {
        if (!canCreate) {
            return;
        }

        setName('');
        setSlug('');
        setOwner('');
        setRuntime('Python SDK');
    };

    const onConnect = async () => {
        if (!canConnect || isConnectPending) {
            return;
        }

        const normalizedUrl = connectUrl.trim();
        const normalizedToken = connectToken.trim();

        setConnectError(null);
        setIsConnectPending(true);

        try {
            await apiFetch<Application>('/apps', {
                method: 'POST',
                body: {
                    url: normalizedUrl,
                    token: normalizedToken,
                },
            });

            setConnectUrl('');
            setConnectToken('');
            await loadApps();
        } catch (error) {
            setConnectError(
                error instanceof Error ? error.message : 'Could not connect app'
            );
        } finally {
            setIsConnectPending(false);
        }
    };

    return (
        <div className="space-y-6">
            <Hero
                title="Application Settings"
                subtitle="Control app defaults, permissions, and lifecycle settings"
                icon="settings"
            >
                <div className="flex items-center gap-2">
                    <AppButton variant="outline" text="Connect app">
                        <ConnectApplicationDialog
                            url={connectUrl}
                            token={connectToken}
                            canConnect={canConnect}
                            isPending={isConnectPending}
                            error={connectError}
                            onUrlChange={setConnectUrl}
                            onTokenChange={setConnectToken}
                            onConnect={() => {
                                void onConnect();
                            }}
                        />
                    </AppButton>

                    <AppButton variant="outline" text="Create app">
                        <CreateApplicationDialog
                            name={name}
                            slug={slug}
                            owner={owner}
                            runtime={runtime}
                            canCreate={canCreate}
                            onNameChange={setName}
                            onSlugChange={setSlug}
                            onOwnerChange={setOwner}
                            onRuntimeChange={setRuntime}
                            onCreate={onCreate}
                        />
                    </AppButton>
                </div>
            </Hero>

            <Card className="gap-0 overflow-hidden py-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>URL</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {applications.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={3}
                                    className="py-8 text-center text-muted-foreground"
                                >
                                    No applications registered yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            applications.map((application) => (
                                <TableRow key={application.id}>
                                    <TableCell className="font-medium">
                                        {application.name}
                                    </TableCell>
                                    <TableCell>{application.url}</TableCell>
                                    <TableCell>Active</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
