import { z } from 'zod';
import { api } from '@/lib/api';
import { useEffect, useState } from 'react';
import { Input } from '@/components/shadcn/input';
import { useSubmit } from '@/lib/hooks/use-submit';
import { zodResolver } from '@hookform/resolvers/zod';
import { Textarea } from '@/components/shadcn/textarea';
import { Step, Wizard } from '@/components/custom/wizard';
import { Dialog } from '@/components/custom/native-dialog';
import { Button } from '@/components/longlink/action/button';
import * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { Field, FieldError, FieldLabel } from '@/components/shadcn/field';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';

const registrationSchema = schemas.zComputeRegistryCreate.extend({
    name: z.string().trim().pipe(schemas.zComputeRegistryCreate.shape.name),
    gateway_url: schemas.zComputeRegistryCreate.shape.gateway_url.min(1),
    storage_endpoint: schemas.zComputeRegistryCreate.shape.storage_endpoint.min(1),
    kubeconfig: z.string().refine((value) => value.trim().length > 0)
});

export function ComputeRegistration({
    onSuccess,
    ...dialogProps
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => Promise<void>;
}) {
    const form = useForm({
        resolver: zodResolver(registrationSchema),
        defaultValues: { name: '', gateway_url: '', storage_endpoint: '', kubeconfig: '' },
        shouldFocusError: false
    });

    const kubeconfig = useWatch({ control: form.control, name: 'kubeconfig' });
    const { setValue } = form;
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

                setValue('kubeconfig', kubeconfig);
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
    }, [file, setValue]);

    async function registerCompute(data: z.output<typeof registrationSchema>) {
        if (fileRead.kind === 'reading') return;

        await api.post('/api/v1/computes', { json: data });
        await onSuccess();
    }

    const submit = useSubmit(registerCompute, {
        onError: () => form.setError('root', { message: 'Could not register the Compute. Please try again.' })
    });

    return (
        <Dialog {...dialogProps}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Register Compute</DialogTitle>
                </DialogHeader>
                <div className="max-h-[80dvh] overflow-auto">
                    <FormProvider {...form}>
                        <form
                            onSubmit={(event) => {
                                void form.handleSubmit(submit)(event);
                            }}
                            noValidate
                            aria-busy={form.formState.isSubmitting}
                        >
                            <Wizard showProgress={false} backVariant="ghost">
                                <Step label="Metadata" fields={['name', 'gateway_url', 'storage_endpoint']}>
                                    <Stack gap={8}>
                                        <Stack gap={3}>
                                            {(
                                                [
                                                    ['name', 'Name'],
                                                    ['gateway_url', 'Gateway URL'],
                                                    ['storage_endpoint', 'Storage endpoint']
                                                ] as const
                                            ).map(([name, label]) => (
                                                <Controller
                                                    key={name}
                                                    name={name}
                                                    control={form.control}
                                                    render={({ field, fieldState }) => (
                                                        <Field data-invalid={fieldState.invalid}>
                                                            <FieldLabel htmlFor={`compute-${name}`}>{label}</FieldLabel>
                                                            <Input
                                                                {...field}
                                                                id={`compute-${name}`}
                                                                aria-invalid={fieldState.invalid}
                                                            />
                                                            <FieldError errors={[fieldState.error]} />
                                                        </Field>
                                                    )}
                                                />
                                            ))}
                                        </Stack>
                                    </Stack>
                                </Step>
                                <Step label="Kubeconfig" fields={['kubeconfig']}>
                                    <Stack gap={8}>
                                        <h2 className="font-semibold tracking-tight text-3xl text-center">
                                            Connect your cluster
                                        </h2>
                                        <Stack gap={3}>
                                            <Field data-invalid={fileRead.kind === 'error'}>
                                                <FieldLabel htmlFor="compute-kubeconfig-file">
                                                    Kubeconfig file
                                                </FieldLabel>
                                                <Input
                                                    id="compute-kubeconfig-file"
                                                    type="file"
                                                    accept=".yaml,.yml"
                                                    aria-invalid={fileRead.kind === 'error'}
                                                    aria-describedby={
                                                        fileRead.kind === 'error' ? 'compute-file-error' : undefined
                                                    }
                                                    onChange={(event) => {
                                                        // Replacing a file invalidates both the previous read and its YAML.
                                                        const selected = event.target.files?.[0] ?? null;
                                                        form.setValue('kubeconfig', '');

                                                        if (selected && !/\.ya?ml$/i.test(selected.name)) {
                                                            setFile(null);
                                                            setFileRead({
                                                                kind: 'error',
                                                                message: `"${selected.name}" is not an accepted file type`
                                                            });

                                                            return;
                                                        }

                                                        setFile(selected);
                                                        setFileRead({ kind: selected ? 'reading' : 'idle' });
                                                    }}
                                                />
                                                {fileRead.kind === 'error' && (
                                                    <FieldError id="compute-file-error">{fileRead.message}</FieldError>
                                                )}
                                            </Field>
                                            <Controller
                                                name="kubeconfig"
                                                control={form.control}
                                                render={({ field, fieldState }) => (
                                                    <Field data-invalid={fieldState.invalid}>
                                                        <FieldLabel htmlFor="compute-kubeconfig">Kubeconfig</FieldLabel>
                                                        <Textarea
                                                            {...field}
                                                            id="compute-kubeconfig"
                                                            rows={8}
                                                            placeholder="Paste the Compute kubeconfig"
                                                            required
                                                            disabled={fileRead.kind === 'reading'}
                                                            aria-busy={fileRead.kind === 'reading' || undefined}
                                                            spellCheck={false}
                                                            aria-invalid={fieldState.invalid}
                                                        />
                                                        {fileRead.kind === 'reading' && (
                                                            <span role="status" className="sr-only">
                                                                Loading
                                                            </span>
                                                        )}
                                                        <FieldError errors={[fieldState.error]} />
                                                    </Field>
                                                )}
                                            />
                                        </Stack>
                                    </Stack>
                                    <Button type="submit" disabled={fileRead.kind === 'reading' || !kubeconfig.trim()}>
                                        Register
                                    </Button>
                                </Step>
                            </Wizard>
                            <FieldError errors={[form.formState.errors.root]} />
                        </form>
                    </FormProvider>
                </div>
            </DialogContent>
        </Dialog>
    );
}
