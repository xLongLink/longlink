import { HardDrive, PlusCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import Hero from '@/longlink/Hero';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import {
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/ui/dialog';
import { Input } from '@/ui/input';
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
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Connect storage provider</DialogTitle>
                        <DialogDescription>
                            Register a top-level object storage provider.
                            Applications can create or bind buckets from these
                            connections.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-3 md:grid-cols-2">
                        <Input
                            placeholder="Provider name"
                            value={providerName}
                            onChange={(event) =>
                                setProviderName(event.target.value)
                            }
                        />
                        <Input
                            placeholder="Endpoint"
                            value={endpoint}
                            onChange={(event) =>
                                setEndpoint(event.target.value)
                            }
                        />
                        <Input
                            placeholder="Bucket"
                            value={bucket}
                            onChange={(event) => setBucket(event.target.value)}
                        />
                        <Input
                            placeholder="Access key"
                            value={accessKey}
                            onChange={(event) =>
                                setAccessKey(event.target.value)
                            }
                        />
                        <Input
                            type="password"
                            placeholder="Secret key"
                            value={secretKey}
                            onChange={(event) =>
                                setSecretKey(event.target.value)
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
