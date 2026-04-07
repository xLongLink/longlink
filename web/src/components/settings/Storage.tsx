import { HardDrive } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ConnectStorageProviderDialog } from '@/components/dialogs';
import Hero from '@/longlink/Hero';
import { apiFetch } from '@/lib/api';
import { Card } from '@/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table';

type StorageConnection = {
    name: string;
    endpoint_url: string;
    access_key_id: string;
    region_name: string | null;
};

type StorageConnectionCreate = {
    name: string;
    endpoint_url: string;
    access_key_id: string;
    secret_access_key: string;
    region_name: string | null;
};

export default function Storage() {
    const [providerName, setProviderName] = useState('');
    const [endpoint, setEndpoint] = useState('');
    const [region, setRegion] = useState('');
    const [accessKey, setAccessKey] = useState('');
    const [secretKey, setSecretKey] = useState('');
    const [connectedProviders, setConnectedProviders] = useState<StorageConnection[]>([]);

    const canConnect = useMemo(() => {
        return (
            providerName.trim().length > 0 &&
            endpoint.trim().length > 0 &&
            accessKey.trim().length > 0 &&
            secretKey.trim().length > 0
        );
    }, [accessKey, endpoint, providerName, secretKey]);

    const resetForm = () => {
        setProviderName('');
        setEndpoint('');
        setRegion('');
        setAccessKey('');
        setSecretKey('');
    };

    useEffect(() => {
        const loadStorageConnections = async () => {
            try {
                const connections = await apiFetch<StorageConnection[]>('/storages');
                setConnectedProviders(connections);
            } catch {
                setConnectedProviders([]);
            }
        };

        void loadStorageConnections();
    }, []);

    const onConnect = async () => {
        if (!canConnect) {
            return;
        }

        const payload: StorageConnectionCreate = {
            name: providerName.trim(),
            endpoint_url: endpoint.trim(),
            access_key_id: accessKey.trim(),
            secret_access_key: secretKey.trim(),
            region_name: region.trim() || null,
        };

        const connection = await apiFetch<StorageConnection>('/storages', {
            method: 'POST',
            body: payload,
        });

        setConnectedProviders((current) => {
            const next = current.filter((provider) => provider.name !== connection.name);
            return [connection, ...next];
        });

        resetForm();
    };

    return (
        <div className="space-y-6">
            <Hero
                title="Storage Settings"
                subtitle="Manage storage providers, quotas, and file policies"
                icon="settings"
                action="Connect"
            >
                <ConnectStorageProviderDialog
                    providerName={providerName}
                    endpoint={endpoint}
                    region={region}
                    accessKey={accessKey}
                    secretKey={secretKey}
                    canConnect={canConnect}
                    onProviderNameChange={setProviderName}
                    onEndpointChange={setEndpoint}
                    onRegionChange={setRegion}
                    onAccessKeyChange={setAccessKey}
                    onSecretKeyChange={setSecretKey}
                    onConnect={() => {
                        void onConnect();
                    }}
                />
            </Hero>

            <Card className="gap-0 overflow-hidden py-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Provider</TableHead>
                            <TableHead>Endpoint</TableHead>
                            <TableHead>Region</TableHead>
                            <TableHead>Access key</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {connectedProviders.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                                    No connected storage providers yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            connectedProviders.map((provider) => (
                                <TableRow key={`${provider.name}-${provider.endpoint_url}`}>
                                    <TableCell className="font-medium">{provider.name}</TableCell>
                                    <TableCell>{provider.endpoint_url}</TableCell>
                                    <TableCell>{provider.region_name ?? '-'}</TableCell>
                                    <TableCell>{provider.access_key_id}</TableCell>
                                    <TableCell>Connected</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            <Card className="border-dashed p-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                    <HardDrive className="mt-0.5 h-4 w-4" />
                    <p>
                        Connected entries represent shared object storage providers. Applications can link dedicated
                        buckets and file policies to one of these providers.
                    </p>
                </div>
            </Card>
        </div>
    );
}
