import { z } from 'zod';
import { api } from '@/lib/api';
import { useState } from 'react';
import { Info } from 'lucide-react';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Spinner } from '@astryxdesign/core/Spinner';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import { TextArea } from '@astryxdesign/core/TextArea';
import { useQueryClient } from '@tanstack/react-query';
import { useApi, useAction } from '@/lib/hooks/use-api';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Table, proportional } from '@astryxdesign/core/Table';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';

// The API also accepts raw YAML and validates its structure on the server.
const registrationSchema = schemas.zComputeRegistryCreate.extend({ kubeconfig: z.string().min(1) });

/** Lists registered Compute infrastructure and manages registration and removal. */
export default function Compute() {
    const [page, setPage] = useState(1);
    const [dialog, setDialog] = useState(
        /** @type {{ kind: 'metadata' | 'deletion', item: import('zod').output<typeof schemas.zComputeRegistryResponse> } | null} */ (
            null
        )
    );
    const [registration, setRegistration] = useState(
        /** @type {import('zod').input<typeof registrationSchema> | null} */ (null)
    );
    const client = useQueryClient();
    const action = useAction();
    const path = `/api/v1/computes?page=${page}&page_size=25`;
    const computes = useApi(path, schemas.zPageComputeRegistryResponse);

    // Keep loading and failures distinct from an empty result.
    if (computes.error) return <Banner status="error" title="Unable to load Compute" />;
    if (!computes.data) return <Spinner label="Loading Compute" />;

    return (
        <Stack gap={8}>
            <Stack direction="horizontal" justify="between" align="center" wrap="wrap">
                <Heading level={1}>Compute</Heading>
                <Button
                    label="Register Compute"
                    onClick={() => setRegistration({ name: '', kubeconfig: '', gateway_url: '', storage_endpoint: '' })}
                />
            </Stack>
            <Stack gap={1}>
                <Table
                    data={computes.data.items}
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
                                <MoreMenu
                                    alignment="end"
                                    items={[
                                        {
                                            id: 'metadata',
                                            label: 'Metadata',
                                            icon: <Info />,
                                            onClick: () => setDialog({ kind: 'metadata', item: row }),
                                        },
                                    ]}
                                />
                            ),
                        },
                    ]}
                />
                <Stack direction="horizontal" gap={2} justify="between">
                    <Button label="Previous" isDisabled={page === 1} onClick={() => setPage(page - 1)} />
                    <Button
                        label="Next"
                        isDisabled={computes.data.total <= page * 25}
                        onClick={() => setPage(page + 1)}
                    />
                </Stack>
            </Stack>
            {registration && (
                <Dialog
                    isOpen
                    purpose="form"
                    onOpenChange={(open) => {
                        if (!open && !action.isPending) setRegistration(null);
                    }}
                >
                    <DialogHeader
                        title="Register Compute"
                        onOpenChange={() => {
                            if (!action.isPending) setRegistration(null);
                        }}
                    />
                    <Stack
                        gap={3}
                        as="form"
                        onSubmit={(event) => {
                            event.preventDefault();
                            if (action.isPending) return;

                            // Validate the registration and leave the draft open on failure.
                            action.mutate(async () => {
                                await api.post('/api/v1/computes', { json: registrationSchema.parse(registration) });
                                await client.invalidateQueries({ queryKey: ['api', path], exact: true });
                                setRegistration(null);
                            });
                        }}
                    >
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
                            <Button
                                label="Cancel"
                                variant="ghost"
                                isDisabled={action.isPending}
                                onClick={() => setRegistration(null)}
                            />
                            <Button label="Register" variant="primary" type="submit" isLoading={action.isPending} />
                        </Stack>
                    </Stack>
                </Dialog>
            )}
            {dialog?.kind === 'metadata' && (
                <Dialog
                    isOpen
                    onOpenChange={(open) => {
                        if (!open) setDialog(null);
                    }}
                >
                    <DialogHeader title="Compute metadata" onOpenChange={() => setDialog(null)} />
                    <Stack gap={2}>
                        <Text>
                            <b>Gateway</b> {dialog.item.gateway_url}
                        </Text>
                        <Text>
                            <b>Database storage class</b> {dialog.item.database_storage_class}
                        </Text>
                        <Text>
                            <b>ID</b> {dialog.item.id}
                        </Text>
                        <Text>
                            <b>Storage endpoint</b> {dialog.item.storage_endpoint}
                        </Text>
                        <Stack direction="horizontal" justify="end">
                            <Button
                                label="Delete"
                                variant="destructive"
                                onClick={() => setDialog({ kind: 'deletion', item: dialog.item })}
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
                        if (!open && !action.isPending) setDialog(null);
                    }}
                >
                    <DialogHeader
                        title="Delete compute"
                        onOpenChange={() => {
                            if (!action.isPending) setDialog(null);
                        }}
                    />
                    <Stack gap={3}>
                        <Text color="secondary">
                            Remove compute {dialog.item.name} from the LongLink Platform? Its Kubernetes resources will
                            remain unchanged.
                        </Text>
                        <Stack direction="horizontal" gap={2} justify="end">
                            <Button
                                label="Cancel"
                                variant="ghost"
                                isDisabled={action.isPending}
                                onClick={() => setDialog(null)}
                            />
                            <Button
                                label="Delete"
                                variant="destructive"
                                isLoading={action.isPending}
                                onClick={() =>
                                    action.mutate(async () => {
                                        // Remove the registry entry without deleting its Kubernetes resources.
                                        await api.delete(`/api/v1/computes/${dialog.item.id}`);
                                        await client.invalidateQueries({ queryKey: ['api', path], exact: true });
                                        setDialog(null);
                                    })
                                }
                            />
                        </Stack>
                    </Stack>
                </Dialog>
            )}
        </Stack>
    );
}
