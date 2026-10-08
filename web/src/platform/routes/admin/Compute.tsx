import { z } from 'zod';
import { api } from '@/lib/api';
import { useState } from 'react';
import { Info } from 'lucide-react';
import { NoIndex } from '@/components/Seo';
import { useApi } from '@/lib/hooks/use-api';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { TextArea } from '@astryxdesign/core/TextArea';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Table, proportional } from '@astryxdesign/core/Table';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';

// The API also accepts raw YAML and validates its structure on the server.
const registrationSchema = schemas.zComputeRegistryCreate.extend({ kubeconfig: z.string().min(1) });

/** Lists registered Compute infrastructure and manages registration and removal. */
export default function Compute() {
    const [page, setPage] = useState(1);

    const [dialog, setDialog] = useState<
        { kind: 'metadata'; id: string } | { kind: 'deletion'; item: { id: string; name: string } } | null
    >(null);

    const [registration, setRegistration] = useState<z.input<typeof registrationSchema> | null>(null);
    const path = `/api/v1/computes?page=${page}&page_size=25`;
    const [computes, invalidate] = useApi<z.output<typeof schemas.zPageComputeRegistryResponse>>(path);

    // Use current metadata and clear missing selections so returning to a page cannot reopen the dialog.
    const metadata = dialog?.kind === 'metadata' ? computes.items.find((item) => item.id === dialog.id) : undefined;

    if (dialog?.kind === 'metadata' && !metadata) setDialog(null);

    /** Registers the validated Compute draft and refreshes the list. */
    async function registerCompute() {
        if (!registration) return;

        // Validate the draft and refresh the list only after registration succeeds.
        await api.post('/api/v1/computes', { json: registrationSchema.parse(registration) });
        await invalidate();
        setRegistration(null);
    }

    return (
        <Stack gap={4}>
            <NoIndex title="Compute | LongLink" />
            <Stack direction="horizontal" justify="between" align="center" wrap="wrap">
                <Heading level={1}>Compute</Heading>
                <Button
                    label="Register Compute"
                    onClick={() => setRegistration({ name: '', kubeconfig: '', gateway_url: '', storage_endpoint: '' })}
                />
            </Stack>
            <Stack gap={1}>
                <Table
                    data={computes.items}
                    idKey="id"
                    hasHover
                    density="compact"
                    columns={[
                        {
                            key: 'name',
                            header: 'Compute',
                            width: proportional(1),
                            renderCell: (row) => (
                                <Stack align="start">
                                    <Text>{row.name}</Text>
                                    <Text type="supporting">{row.gateway_url}</Text>
                                </Stack>
                            ),
                        },
                        {
                            key: 'id',
                            header: 'Actions',
                            align: 'end',
                            width: proportional(0.5),
                            renderCell: (row) => (
                                <Button
                                    label="Metadata"
                                    icon={<Info />}
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setDialog({ kind: 'metadata', id: row.id })}
                                />
                            ),
                        },
                    ]}
                />
                <Stack direction="horizontal" gap={2} justify="between">
                    <Button label="Previous" isDisabled={page === 1} onClick={() => setPage(page - 1)} />
                    <Button label="Next" isDisabled={computes.total <= page * 25} onClick={() => setPage(page + 1)} />
                </Stack>
            </Stack>
            {registration && (
                <Dialog
                    isOpen
                    purpose="form"
                    onOpenChange={(open) => {
                        if (!open) setRegistration(null);
                    }}
                >
                    <DialogHeader title="Register Compute" onOpenChange={() => setRegistration(null)} />
                    <form action={registerCompute}>
                        <Stack gap={3}>
                            <TextInput
                                label="Name"
                                value={registration.name}
                                isRequired
                                onChange={(name) => setRegistration({ ...registration, name })}
                            />
                            <TextInput
                                label="Gateway URL"
                                value={registration.gateway_url}
                                placeholder="https://<nightly_gateway_floating_ip>"
                                isRequired
                                onChange={(gateway_url) => setRegistration({ ...registration, gateway_url })}
                            />
                            <TextInput
                                label="Storage endpoint"
                                value={registration.storage_endpoint}
                                placeholder="https://<nightly_storage_floating_ip>"
                                isRequired
                                onChange={(storage_endpoint) => setRegistration({ ...registration, storage_endpoint })}
                            />
                            <TextArea
                                label="Kubeconfig"
                                value={registration.kubeconfig}
                                placeholder="Paste the Compute kubeconfig"
                                isRequired
                                onChange={(kubeconfig) => setRegistration({ ...registration, kubeconfig })}
                            />
                            <Stack direction="horizontal" gap={2} justify="end">
                                <Button label="Cancel" variant="ghost" onClick={() => setRegistration(null)} />
                                <Button label="Register" variant="primary" type="submit" />
                            </Stack>
                        </Stack>
                    </form>
                </Dialog>
            )}
            {metadata && (
                <Dialog
                    isOpen
                    onOpenChange={(open) => {
                        if (!open) setDialog(null);
                    }}
                >
                    <DialogHeader title="Compute metadata" onOpenChange={() => setDialog(null)} />
                    <Stack gap={2}>
                        <Text>
                            <b>Gateway</b> {metadata.gateway_url}
                        </Text>
                        <Text>
                            <b>Database storage class</b> {metadata.database_storage_class}
                        </Text>
                        <Text>
                            <b>ID</b> {metadata.id}
                        </Text>
                        <Text>
                            <b>Storage endpoint</b> {metadata.storage_endpoint}
                        </Text>
                        <Stack direction="horizontal" justify="end">
                            <Button
                                label="Delete"
                                variant="destructive"
                                onClick={() =>
                                    setDialog({
                                        kind: 'deletion',
                                        item: { id: metadata.id, name: metadata.name },
                                    })
                                }
                            />
                        </Stack>
                    </Stack>
                </Dialog>
            )}
            {dialog?.kind === 'deletion' && (
                <Dialog
                    isOpen
                    purpose="form"
                    onOpenChange={(open) => {
                        if (!open) setDialog(null);
                    }}
                >
                    <DialogHeader
                        title="Delete compute"
                        onOpenChange={() => {
                            setDialog(null);
                        }}
                    />
                    <Stack gap={3}>
                        <Text color="secondary">
                            Remove compute {dialog.item.name} from the LongLink Platform? Its Kubernetes resources will
                            remain unchanged.
                        </Text>
                        <Stack direction="horizontal" gap={2} justify="end">
                            <Button label="Cancel" variant="ghost" onClick={() => setDialog(null)} />
                            <Button
                                label="Delete"
                                variant="destructive"
                                clickAction={async () => {
                                    // Remove the registry entry without deleting its Kubernetes resources.
                                    await api.delete(`/api/v1/computes/${dialog.item.id}`);
                                    await invalidate();
                                    setDialog(null);
                                }}
                            />
                        </Stack>
                    </Stack>
                </Dialog>
            )}
        </Stack>
    );
}
