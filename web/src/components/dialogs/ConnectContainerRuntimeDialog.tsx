import { PlusCircle } from 'lucide-react';
import { Button } from '@/ui/button';
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/ui/dialog';
import { Input } from '@/ui/input';

type ConnectContainerRuntimeDialogProps = {
    runtimeName: string;
    registry: string;
    namespace: string;
    cpuLimit: string;
    apiToken: string;
    canConnect: boolean;
    onRuntimeNameChange: (value: string) => void;
    onRegistryChange: (value: string) => void;
    onNamespaceChange: (value: string) => void;
    onCpuLimitChange: (value: string) => void;
    onApiTokenChange: (value: string) => void;
    onConnect: () => void;
};

export default function ConnectContainerRuntimeDialog({
    runtimeName,
    registry,
    namespace,
    cpuLimit,
    apiToken,
    canConnect,
    onRuntimeNameChange,
    onRegistryChange,
    onNamespaceChange,
    onCpuLimitChange,
    onApiTokenChange,
    onConnect,
}: ConnectContainerRuntimeDialogProps) {
    return (
        <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
                <DialogTitle>Connect container runtime</DialogTitle>
                <DialogDescription>
                    Register a top-level container runtime. Applications can deploy their modules using one of these
                    runtime connections.
                </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 md:grid-cols-2">
                <Input
                    placeholder="Runtime name"
                    value={runtimeName}
                    onChange={(event) => onRuntimeNameChange(event.target.value)}
                />
                <Input
                    placeholder="Registry URL"
                    value={registry}
                    onChange={(event) => onRegistryChange(event.target.value)}
                />
                <Input
                    placeholder="Namespace"
                    value={namespace}
                    onChange={(event) => onNamespaceChange(event.target.value)}
                />
                <Input
                    placeholder="CPU limit"
                    value={cpuLimit}
                    onChange={(event) => onCpuLimitChange(event.target.value)}
                />
                <Input
                    type="password"
                    placeholder="Runtime API token"
                    value={apiToken}
                    onChange={(event) => onApiTokenChange(event.target.value)}
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
