import { z } from 'zod';
import { api } from '@/lib/api';
import { useEffect, useState } from 'react';
import { Input } from '@/components/shadcn/input';
import { useSubmit } from '@/lib/hooks/use-submit';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Textarea } from '@/components/shadcn/textarea';
import { Stack } from '@/components/longlink/layout/stack';
import { Button } from '@/components/longlink/action/button';
import { Dialog } from '@/components/longlink/layout/dialog';
import { Heading } from '@/components/longlink/display/heading';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { IllustratedForm } from '@/platform/components/illustrated-form';
import { Field, FieldError, FieldLabel } from '@/components/shadcn/field';

const registrationSchema = schemas.zComputeRegistryCreate.extend({
    name: z.string().trim().pipe(schemas.zComputeRegistryCreate.shape.name),
    gateway_url: schemas.zComputeRegistryCreate.shape.gateway_url.min(1),
    storage_endpoint: schemas.zComputeRegistryCreate.shape.storage_endpoint.min(1),
    kubeconfig: z.string().refine((value) => value.trim().length > 0)
});

export function ComputeRegistration({ onSuccess, onClose }: { onClose: () => void; onSuccess: () => Promise<void> }) {
    const form = useForm({
        resolver: zodResolver(registrationSchema),
        defaultValues: { name: '', gateway_url: '', storage_endpoint: '', kubeconfig: '' }
    });

    const kubeconfig = useWatch({ control: form.control, name: 'kubeconfig' });
    const { setValue } = form;
    const [fileRead, setFileRead] = useState<
        { kind: 'idle' } | { kind: 'reading'; file: File } | { kind: 'error'; message: string }
    >({ kind: 'idle' });

    // Ignore an obsolete read after replacing, clearing, or dismissing the selected file.
    useEffect(() => {
        if (fileRead.kind !== 'reading') return;
        let canceled = false;

        async function readKubeconfig(selected: File) {
            try {
                const kubeconfig = await selected.text();

                if (canceled) return;

                if (!kubeconfig.trim()) {
                    setFileRead({ kind: 'error', message: 'The kubeconfig file is empty.' });

                    return;
                }

                setValue('kubeconfig', kubeconfig);
                setFileRead({ kind: 'idle' });
            } catch {
                if (!canceled) {
                    setFileRead({ kind: 'error', message: 'Unable to read the kubeconfig file. Choose another file.' });
                }
            }
        }

        void readKubeconfig(fileRead.file);

        return () => {
            canceled = true;
        };
    }, [fileRead, setValue]);

    async function registerCompute(data: z.output<typeof registrationSchema>) {
        if (fileRead.kind === 'reading') return;

        await api.post('/api/v1/computes', { json: data });
        await onSuccess();
    }

    const submit = useSubmit(registerCompute, {
        onError: () => form.setError('root', { message: 'Could not register the Compute. Please try again.' })
    });

    return (
        <Dialog
            open
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
            title="Register Compute"
            showHeader={false}
            bodyPadding={false}
        >
            <IllustratedForm
                image={{ src: '/images/capacity-dialog.png', width: 768, height: 768 }}
                onSubmit={form.handleSubmit(submit)}
                noValidate
                aria-busy={form.formState.isSubmitting}
            >
                <fieldset disabled={form.formState.isSubmitting} className="flex min-w-0 flex-col gap-4 border-0 p-6">
                    <Heading level={2} size={4} align="center">
                        Register Compute
                    </Heading>
                    {(
                        [
                            ['name', 'Name'],
                            ['gateway_url', 'Gateway URL'],
                            ['storage_endpoint', 'Storage endpoint']
                        ] as const
                    ).map(([name, label]) => (
                        <Field key={name} data-invalid={Boolean(form.formState.errors[name])}>
                            <FieldLabel htmlFor={`compute-${name}`}>{label}</FieldLabel>
                            <Input
                                {...form.register(name)}
                                id={`compute-${name}`}
                                aria-invalid={Boolean(form.formState.errors[name])}
                            />
                            <FieldError errors={[form.formState.errors[name]]} />
                        </Field>
                    ))}
                    <Field data-invalid={fileRead.kind === 'error'}>
                        <FieldLabel htmlFor="compute-kubeconfig-file">Kubeconfig file</FieldLabel>
                        <Input
                            id="compute-kubeconfig-file"
                            type="file"
                            accept=".yaml,.yml"
                            aria-invalid={fileRead.kind === 'error'}
                            aria-describedby={fileRead.kind === 'error' ? 'compute-file-error' : undefined}
                            onChange={(event) => {
                                // Replacing a file invalidates both the previous read and its YAML.
                                const selected = event.target.files?.[0] ?? null;
                                form.setValue('kubeconfig', '');

                                if (selected && !/\.ya?ml$/i.test(selected.name)) {
                                    setFileRead({
                                        kind: 'error',
                                        message: `"${selected.name}" is not an accepted file type`
                                    });

                                    return;
                                }

                                setFileRead(selected ? { kind: 'reading', file: selected } : { kind: 'idle' });
                            }}
                        />
                        {fileRead.kind === 'error' && (
                            <FieldError id="compute-file-error">{fileRead.message}</FieldError>
                        )}
                    </Field>
                    <Field data-invalid={Boolean(form.formState.errors.kubeconfig)}>
                        <FieldLabel htmlFor="compute-kubeconfig">Kubeconfig</FieldLabel>
                        <Textarea
                            {...form.register('kubeconfig')}
                            id="compute-kubeconfig"
                            rows={8}
                            placeholder="Paste the Compute kubeconfig"
                            required
                            disabled={fileRead.kind === 'reading'}
                            aria-busy={fileRead.kind === 'reading' || undefined}
                            spellCheck={false}
                            aria-invalid={Boolean(form.formState.errors.kubeconfig)}
                        />
                        {fileRead.kind === 'reading' && (
                            <span role="status" className="sr-only">
                                Loading
                            </span>
                        )}
                        <FieldError errors={[form.formState.errors.kubeconfig]} />
                    </Field>
                    <FieldError errors={[form.formState.errors.root]} />
                    <Stack direction="horizontal" gap={2} align="center" justify="between">
                        <Button type="button" variant="link" disabled={form.formState.isSubmitting} onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={form.formState.isSubmitting || fileRead.kind === 'reading' || !kubeconfig.trim()}
                        >
                            Register
                        </Button>
                    </Stack>
                </fieldset>
            </IllustratedForm>
        </Dialog>
    );
}
