import { Box, PlusCircle } from 'lucide-react';
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

type ContainerRuntime = {
    name: string;
    registry: string;
    namespace: string;
    cpuLimit: string;
    status: 'Connected';
};

export default function Container() {
    const [runtimeName, setRuntimeName] = useState('');
    const [registry, setRegistry] = useState('');
    const [namespace, setNamespace] = useState('');
    const [cpuLimit, setCpuLimit] = useState('1000m');
    const [apiToken, setApiToken] = useState('');
    const [connectedRuntimes, setConnectedRuntimes] = useState<
        ContainerRuntime[]
    >([]);

    const canConnect = useMemo(() => {
        return (
            runtimeName.trim().length > 0 &&
            registry.trim().length > 0 &&
            namespace.trim().length > 0 &&
            cpuLimit.trim().length > 0 &&
            apiToken.trim().length > 0
        );
    }, [apiToken, cpuLimit, namespace, registry, runtimeName]);

    const onConnect = () => {
        if (!canConnect) {
            return;
        }

        setConnectedRuntimes((current) => [
            {
                name: runtimeName.trim(),
                registry: registry.trim(),
                namespace: namespace.trim(),
                cpuLimit: cpuLimit.trim(),
                status: 'Connected',
            },
            ...current,
        ]);

        setRuntimeName('');
        setRegistry('');
        setNamespace('');
        setCpuLimit('1000m');
        setApiToken('');
    };

    return (
        <div className="space-y-6">
            <Hero
                title="Container Settings"
                subtitle="Configure container runtimes, registries, and compute quotas"
                icon="settings"
                action="Connect"
            >
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Connect container runtime</DialogTitle>
                        <DialogDescription>
                            Register a top-level container runtime. Applications
                            can deploy their modules using one of these runtime
                            connections.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-3 md:grid-cols-2">
                        <Input
                            placeholder="Runtime name"
                            value={runtimeName}
                            onChange={(event) =>
                                setRuntimeName(event.target.value)
                            }
                        />
                        <Input
                            placeholder="Registry URL"
                            value={registry}
                            onChange={(event) =>
                                setRegistry(event.target.value)
                            }
                        />
                        <Input
                            placeholder="Namespace"
                            value={namespace}
                            onChange={(event) =>
                                setNamespace(event.target.value)
                            }
                        />
                        <Input
                            placeholder="CPU limit"
                            value={cpuLimit}
                            onChange={(event) =>
                                setCpuLimit(event.target.value)
                            }
                        />
                        <Input
                            type="password"
                            placeholder="Runtime API token"
                            value={apiToken}
                            onChange={(event) =>
                                setApiToken(event.target.value)
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
                            <TableHead>Runtime</TableHead>
                            <TableHead>Registry</TableHead>
                            <TableHead>Namespace</TableHead>
                            <TableHead>CPU limit</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {connectedRuntimes.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={5}
                                    className="py-8 text-center text-muted-foreground"
                                >
                                    No connected container runtimes yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            connectedRuntimes.map((runtime) => (
                                <TableRow
                                    key={`${runtime.name}-${runtime.namespace}-${runtime.registry}`}
                                >
                                    <TableCell className="font-medium">
                                        {runtime.name}
                                    </TableCell>
                                    <TableCell>{runtime.registry}</TableCell>
                                    <TableCell>{runtime.namespace}</TableCell>
                                    <TableCell>{runtime.cpuLimit}</TableCell>
                                    <TableCell>{runtime.status}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            <Card className="border-dashed p-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                    <Box className="mt-0.5 h-4 w-4" />
                    <p>
                        Connected runtimes represent shared container
                        infrastructure. Applications can set image tags,
                        environment variables, and scaling policies on top of
                        these runtime connections.
                    </p>
                </div>
            </Card>
        </div>
    );
}
