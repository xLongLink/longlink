import { HardDrive } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ConnectStorageProviderDialog } from '@/components/dialogs';
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

type StorageProvider = {
    name: string;
    endpoint: string;
    bucket: string;
    accessKey: string;
    status: 'Connected';
};

export default function Storage() {
    const [providerName, setProviderName] = useState('');
    const [endpoint, setEndpoint] = useState('');
    const [bucket, setBucket] = useState('');
    const [accessKey, setAccessKey] = useState('');
    const [secretKey, setSecretKey] = useState('');
    const [connectedProviders, setConnectedProviders] = useState<
        StorageProvider[]
    >([]);

    const canConnect = useMemo(() => {
        return (
            providerName.trim().length > 0 &&
            endpoint.trim().length > 0 &&
            bucket.trim().length > 0 &&
            accessKey.trim().length > 0 &&
            secretKey.trim().length > 0
        );
    }, [accessKey, bucket, endpoint, providerName, secretKey]);

    const onConnect = () => {
        if (!canConnect) {
            return;
        }

        setConnectedProviders((current) => [
            {
                name: providerName.trim(),
                endpoint: endpoint.trim(),
                bucket: bucket.trim(),
                accessKey: accessKey.trim(),
                status: 'Connected',
            },
            ...current,
        ]);

        setProviderName('');
        setEndpoint('');
        setBucket('');
        setAccessKey('');
        setSecretKey('');
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
                    bucket={bucket}
                    accessKey={accessKey}
                    secretKey={secretKey}
                    canConnect={canConnect}
                    onProviderNameChange={setProviderName}
                    onEndpointChange={setEndpoint}
                    onBucketChange={setBucket}
                    onAccessKeyChange={setAccessKey}
                    onSecretKeyChange={setSecretKey}
                    onConnect={onConnect}
                />
            </Hero>

            <Card className="overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Provider</TableHead>
                            <TableHead>Endpoint</TableHead>
                            <TableHead>Bucket</TableHead>
                            <TableHead>Access key</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {connectedProviders.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={5}
                                    className="py-8 text-center text-muted-foreground"
                                >
                                    No connected storage providers yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            connectedProviders.map((provider) => (
                                <TableRow
                                    key={`${provider.name}-${provider.bucket}-${provider.endpoint}`}
                                >
                                    <TableCell className="font-medium">
                                        {provider.name}
                                    </TableCell>
                                    <TableCell>{provider.endpoint}</TableCell>
                                    <TableCell>{provider.bucket}</TableCell>
                                    <TableCell>{provider.accessKey}</TableCell>
                                    <TableCell>{provider.status}</TableCell>
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
                        Connected entries represent shared object storage
                        providers. Applications can link dedicated buckets and
                        file policies to one of these providers.
                    </p>
                </div>
            </Card>
        </div>
    );
}
