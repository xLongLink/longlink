import { z } from 'zod';
import { useAdminList } from './use-list';
import { api, ApiError } from '@/lib/api';
import { useApiError } from '@/lib/errors';
import { Form } from '@/components/ui/Form';
import { Info, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApi } from '@/lib/hooks/use-api';
import { Text } from '@astryxdesign/core/Text';
import { Dialog } from '@/components/ui/Dialog';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { TextInput } from '@/components/ui/TextInput';
import { DeletionDialog } from '@/components/Deletion';
import { TextArea } from '@astryxdesign/core/TextArea';
import { Step, Stepper } from '@/components/ui/Stepper';
import { FileInput } from '@astryxdesign/core/FileInput';
import { Pagination } from '@astryxdesign/core/Pagination';
import { Table, proportional } from '@astryxdesign/core/Table';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';

// The API also accepts raw YAML and validates its structure on the server.
const registrationSchema = schemas.zComputeRegistryCreate.extend({
    kubeconfig: z.string().refine((value) => value.trim().length > 0),
});

/** Lists registered Compute infrastructure and manages registration and removal. */
export default function Compute() {
    const { search, pagination, suffix } = useAdminList();

    const [dialog, setDialog] = useState<
        | { kind: 'registration' }
        | { kind: 'metadata'; id: string }
        | { kind: 'deletion'; item: { id: string; name: string } }
        | null
    >(null);

    const path = `/api/v1/computes${suffix}`;
    const [computes, invalidate] = useApi(path, schemas.zPageComputeRegistryResponse);

    // Use current metadata and clear missing selections so returning to a page cannot reopen the dialog.
    const metadata = dialog?.kind === 'metadata' ? computes.items.find((item) => item.id === dialog.id) : undefined;

    if (dialog?.kind === 'metadata' && !metadata) setDialog(null);

    return (
        <Stack gap={2}>
            <title>Compute | LongLink</title>
            <Stack direction="horizontal" justify="between" align="center" wrap="wrap">
                <Heading level={1}>Compute</Heading>
                <Button label="Register Compute" onClick={() => setDialog({ kind: 'registration' })} />
            </Stack>
            <TextInput
                label="Search compute"
                placeholder="Search by name or endpoint"
                {...search}
                startIcon={<Search />}
            />
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
                <Stack as="footer" align="center" paddingBlock={2}>
                    <Pagination {...pagination} totalItems={computes.total} variant="pages" />
                </Stack>
            </Stack>
            {dialog?.kind === 'registration' && (
                <ComputeRegistration
                    invalidate={invalidate}
                    onClose={() => {
                        // An obsolete registration cannot dismiss a replacement dialog selection.
                        setDialog((current) => (current === dialog ? null : current));
                    }}
                />
            )}
            {metadata && (
                <Dialog
                    title="Compute metadata"
                    isOpen
                    onOpenChange={(open) => {
                        if (!open) setDialog(null);
                    }}
                >
                    <Stack gap={2} padding={8}>
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
                <DeletionDialog
                    confirmation={{
                        title: 'Delete compute',
                        description: `Remove compute ${dialog.item.name} from the LongLink Platform? Its Kubernetes resources will remain unchanged.`,
                        onDelete: async () => {
                            // Remove the registry entry without deleting its Kubernetes resources.
                            await api.delete(`/api/v1/computes/${dialog.item.id}`);
                            await invalidate();
                            setDialog((current) => (current === dialog ? null : current));
                        },
                    }}
                    onClose={() => setDialog(null)}
                />
            )}
        </Stack>
    );
}

/** Owns a fresh registration draft for the lifetime of the form dialog. */
function ComputeRegistration({ invalidate, onClose }: { invalidate: () => Promise<void>; onClose: () => void }) {
    const reportApiError = useApiError();

    // Opening a new dialog starts with blank fields; dismissal discards this draft.
    const [kubeconfig, setKubeconfig] = useState('');

    const [file, setFile] = useState<File | null>(null);

    const [fileRead, setFileRead] = useState<
        { kind: 'idle' } | { kind: 'reading' } | { kind: 'error'; message: string }
    >({ kind: 'idle' });

    // Ignore an obsolete read after replacing, clearing, or dismissing the selected file.
    useEffect(() => {
        if (!file) return;

        let canceled = false;

        /** Loads the selected YAML without parsing or exposing its credentials in errors. */
        async function readKubeconfig(selected: File) {
            try {
                const kubeconfig = await selected.text();

                if (canceled) return;

                // Preserve the original YAML text; the API owns syntax and kubeconfig validation.
                if (!kubeconfig.trim()) {
                    setFileRead({ kind: 'error', message: 'The kubeconfig file is empty.' });

                    return;
                }

                setKubeconfig(kubeconfig);
                setFileRead({ kind: 'idle' });
            } catch {
                if (!canceled) {
                    setFileRead({ kind: 'error', message: 'Unable to read the kubeconfig file. Choose another file.' });
                }
            }
        }

        void readKubeconfig(file);

        return () => {
            canceled = true;
        };
    }, [file]);

    /** Registers the validated Compute draft and refreshes the list. */
    async function registerCompute(data: FormData) {
        // Validate the original field values and refresh the list only after registration succeeds.
        try {
            const json = registrationSchema.parse({
                name: data.get('name'),
                gateway_url: data.get('gateway_url'),
                storage_endpoint: data.get('storage_endpoint'),
                kubeconfig,
            });

            await api.post('/api/v1/computes', { json });
            await invalidate();
            onClose();
        } catch (cause) {
            reportApiError(cause);

            // Keep submitted credentials and untrusted diagnostics out of the shared form's error banner.
            throw new Error(
                cause instanceof ApiError ? cause.message : 'The request could not be completed. Please try again.'
            );
        }
    }

    // Let the shared wizard own navigation, validation, and persistent fields within the creation dialog shell.
    return (
        <Dialog
            isOpen
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <Form action={registerCompute} submitDisabled={fileRead.kind === 'reading' || !kubeconfig.trim()}>
                <Stepper variant="wizard" height="min(560px, calc(100dvh - var(--spacing-10) * 4))" backVariant="ghost">
                    <Step label="Metadata">
                        <Stack gap={8}>
                            <Heading level={2} justify="center">
                                Register Compute
                            </Heading>
                            <Stack gap={3}>
                                <TextInput label="Name" name="name" required />
                                <TextInput
                                    label="Gateway URL"
                                    name="gateway_url"
                                    placeholder="https://<nightly_gateway_floating_ip>"
                                    required
                                />
                                <TextInput
                                    label="Storage endpoint"
                                    name="storage_endpoint"
                                    placeholder="https://<nightly_storage_floating_ip>"
                                    required
                                />
                            </Stack>
                        </Stack>
                    </Step>
                    <Step label="Kubeconfig">
                        <Stack gap={8}>
                            <Heading level={2} justify="center">
                                Connect your cluster
                            </Heading>
                            <Stack gap={3}>
                                <FileInput
                                    label="Kubeconfig file"
                                    accept=".yaml,.yml"
                                    value={file}
                                    status={
                                        fileRead.kind === 'error'
                                            ? { type: 'error', message: fileRead.message }
                                            : undefined
                                    }
                                    onChange={(files) => {
                                        // Clear previous contents immediately so invalid or pending files cannot submit stale YAML.
                                        const selected = Array.isArray(files) ? (files[0] ?? null) : files;
                                        setFile(selected);
                                        setFileRead({ kind: selected ? 'reading' : 'idle' });
                                        setKubeconfig('');
                                    }}
                                />
                                <TextArea
                                    label="Kubeconfig"
                                    rows={8}
                                    value={kubeconfig}
                                    placeholder="Paste the Compute kubeconfig"
                                    isRequired
                                    isDisabled={fileRead.kind === 'reading'}
                                    isLoading={fileRead.kind === 'reading'}
                                    hasSpellCheck={false}
                                    onChange={setKubeconfig}
                                />
                            </Stack>
                        </Stack>
                        <Button
                            type="submit"
                            label="Register"
                            variant="primary"
                            isDisabled={fileRead.kind === 'reading' || !kubeconfig.trim()}
                        />
                    </Step>
                </Stepper>
            </Form>
        </Dialog>
    );
}
