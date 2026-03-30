import { Box } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ConnectContainerRuntimeDialog } from '@/components/dialogs';
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
                <ConnectContainerRuntimeDialog
                    runtimeName={runtimeName}
                    registry={registry}
                    namespace={namespace}
                    cpuLimit={cpuLimit}
                    apiToken={apiToken}
                    canConnect={canConnect}
                    onRuntimeNameChange={setRuntimeName}
                    onRegistryChange={setRegistry}
                    onNamespaceChange={setNamespace}
                    onCpuLimitChange={setCpuLimit}
                    onApiTokenChange={setApiToken}
                    onConnect={onConnect}
                />
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
