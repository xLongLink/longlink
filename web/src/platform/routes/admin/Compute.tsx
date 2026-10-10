import { z } from 'zod';
import { api } from '@/lib/api';
import { Info } from 'lucide-react';
import { useApiError } from '@/lib/errors';
import { useEffect, useState } from 'react';
import { useApi } from '@/lib/hooks/use-api';
import { NoIndex } from '@/components/NoIndex';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { TextArea } from '@astryxdesign/core/TextArea';
import { FileInput } from '@astryxdesign/core/FileInput';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Pagination } from '@astryxdesign/core/Pagination';
import { Table, proportional } from '@astryxdesign/core/Table';
import { DeletionDialog } from '@/platform/components/Deletion';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';

// The API also accepts raw YAML and validates its structure on the server.
const registrationSchema = schemas.zComputeRegistryCreate.extend({
    kubeconfig: z.string().refine((value) => value.trim().length > 0),
});

/** Lists registered Compute infrastructure and manages registration and removal. */
export default function Compute() {
    const [page, setPage] = useState(1);

    const [dialog, setDialog] = useState<
        { kind: 'metadata'; id: string } | { kind: 'deletion'; item: { id: string; name: string } } | null
    >(null);

    const [registrationOpen, setRegistrationOpen] = useState(false);
    const path = `/api/v1/computes?page=${page}&page_size=25`;
    const [computes, invalidate] = useApi(path, schemas.zPageComputeRegistryResponse);

    // Use current metadata and clear missing selections so returning to a page cannot reopen the dialog.
    const metadata = dialog?.kind === 'metadata' ? computes.items.find((item) => item.id === dialog.id) : undefined;

    if (dialog?.kind === 'metadata' && !metadata) setDialog(null);

    return (
        <Stack gap={4}>
            <NoIndex title="Compute | LongLink" />
            <Stack direction="horizontal" justify="between" align="center" wrap="wrap">
                <Heading level={1}>Compute</Heading>
                <Button label="Register Compute" onClick={() => setRegistrationOpen(true)} />
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
                <Pagination page={page} onChange={setPage} totalItems={computes.total} pageSize={25} variant="none" />
            </Stack>
            {registrationOpen && (
                <ComputeRegistration invalidate={invalidate} onClose={() => setRegistrationOpen(false)} />
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
                <DeletionDialog
                    confirmation={{
                        title: 'Delete compute',
                        description: `Remove compute ${dialog.item.name} from the LongLink Platform? Its Kubernetes resources will remain unchanged.`,
                        onDelete: async () => {
                            // Remove the registry entry without deleting its Kubernetes resources.
                            await api.delete(`/api/v1/computes/${dialog.item.id}`);
                            await invalidate();
                            setDialog(null);
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
    const [registration, setRegistration] = useState<z.input<typeof registrationSchema>>({
        name: '',
        kubeconfig: '',
        gateway_url: '',
        storage_endpoint: '',
    });

    const [file, setFile] = useState<File | null>(null);

    const [fileRead, setFileRead] = useState<
        { kind: 'idle' } | { kind: 'reading' } | { kind: 'error'; message: string }
    >({ kind: 'idle' });

    const [isSubmitting, setIsSubmitting] = useState(false);

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

                setRegistration((draft) => ({ ...draft, kubeconfig }));
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
    async function registerCompute() {
        // Block keyboard submission as well as button clicks until a complete draft is available.
        if (fileRead.kind === 'reading' || isSubmitting || !registration.kubeconfig.trim()) return;

        // Validate the draft and refresh the list only after registration succeeds.
        setIsSubmitting(true);

        try {
            await api.post('/api/v1/computes', { json: registrationSchema.parse(registration) });
            await invalidate();
            onClose();
        } catch (cause) {
            reportApiError(cause);
        } finally {
            setIsSubmitting(false);
        }
    }

    // Preserve the existing 400px form dialog, control spacing, and dismissal behavior.
    return (
        <Dialog
            isOpen
            purpose="form"
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogHeader title="Register Compute" onOpenChange={onClose} />
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
                    <FileInput
                        label="Kubeconfig file"
                        accept=".yaml,.yml"
                        value={file}
                        isDisabled={isSubmitting}
                        status={fileRead.kind === 'error' ? { type: 'error', message: fileRead.message } : undefined}
                        onChange={(files) => {
                            // Clear previous contents immediately so invalid or pending files cannot submit stale YAML.
                            const selected = Array.isArray(files) ? (files[0] ?? null) : files;
                            setFile(selected);
                            setFileRead({ kind: selected ? 'reading' : 'idle' });
                            setRegistration((draft) => ({ ...draft, kubeconfig: '' }));
                        }}
                    />
                    <TextArea
                        label="Kubeconfig"
                        value={registration.kubeconfig}
                        placeholder="Paste the Compute kubeconfig"
                        isRequired
                        isDisabled={fileRead.kind === 'reading' || isSubmitting}
                        isLoading={fileRead.kind === 'reading'}
                        hasSpellCheck={false}
                        onChange={(kubeconfig) => setRegistration((draft) => ({ ...draft, kubeconfig }))}
                    />
                    <Stack direction="horizontal" gap={2} justify="end">
                        <Button label="Cancel" variant="ghost" onClick={onClose} />
                        <Button
                            label="Register"
                            variant="primary"
                            type="submit"
                            isLoading={isSubmitting}
                            isDisabled={fileRead.kind === 'reading' || !registration.kubeconfig.trim()}
                        />
                    </Stack>
                </Stack>
            </form>
        </Dialog>
    );
}
