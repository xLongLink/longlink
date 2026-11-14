import { z } from 'zod';
import { api } from '@/lib/api';
import { Dialog } from './dialog';
import { useEffect, useState } from 'react';
import { Form } from '@/components/custom/form';
import { TextInput } from '@/components/ui/text-input';
import { Step, Wizard } from '@/components/custom/wizard';
import { NativeFileInput } from '@/components/custom/file-input';
import { NativeTextArea } from '@/components/ui/native-text-area';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { NativeButton as Button } from '@/components/ui/native-button';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { NativeHeading as Heading } from '@/components/custom/native-heading';

const registrationSchema = schemas.zComputeRegistryCreate.extend({
    kubeconfig: z.string().refine((value) => value.trim().length > 0)
});

export function ComputeRegistration({ onSuccess, onClose }: { onSuccess: () => Promise<void>; onClose: () => void }) {
    const [kubeconfig, setKubeconfig] = useState('');
    const [file, setFile] = useState<File | null>(null);

    const [fileRead, setFileRead] = useState<
        { kind: 'idle' } | { kind: 'reading' } | { kind: 'error'; message: string }
    >({ kind: 'idle' });

    // Ignore an obsolete read after replacing, clearing, or dismissing the selected file.
    useEffect(() => {
        if (!file) return;
        let canceled = false;

        async function readKubeconfig(selected: File) {
            try {
                const kubeconfig = await selected.text();

                if (canceled) return;

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

    async function registerCompute(data: FormData) {
        const json = registrationSchema.parse({
            name: data.get('name'),
            gateway_url: data.get('gateway_url'),
            storage_endpoint: data.get('storage_endpoint'),
            kubeconfig
        });

        await api.post('/api/v1/computes', { json });
        await onSuccess();
    }

    return (
        <Dialog isOpen onOpenChange={(open) => !open && onClose()}>
            <Form action={registerCompute} submitDisabled={fileRead.kind === 'reading' || !kubeconfig.trim()}>
                <Wizard height="min(560px, calc(100dvh - var(--spacing) * 40))" backVariant="ghost">
                    <Step label="Metadata">
                        <Stack gap={8}>
                            <Heading level={2} className="text-center">
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
                            <Heading level={2} className="text-center">
                                Connect your cluster
                            </Heading>
                            <Stack gap={3}>
                                <NativeFileInput
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
                                <NativeTextArea
                                    label="Kubeconfig"
                                    rows={8}
                                    value={kubeconfig}
                                    placeholder="Paste the Compute kubeconfig"
                                    required
                                    disabled={fileRead.kind === 'reading'}
                                    loading={fileRead.kind === 'reading'}
                                    spellCheck={false}
                                    onChange={setKubeconfig}
                                />
                            </Stack>
                        </Stack>
                        <Button
                            type="submit"
                            label="Register"
                            variant="default"
                            disabled={fileRead.kind === 'reading' || !kubeconfig.trim()}
                        />
                    </Step>
                </Wizard>
            </Form>
        </Dialog>
    );
}
