import { z } from 'zod';
import { api } from '@/lib/api';
import { Dialog } from '@/components/ui/Dialog';
import { useId, useRef, useState } from 'react';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { useMutation } from '@tanstack/react-query';
import { createGuardedOpenChange } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { TextInput } from '@astryxdesign/core/TextInput';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zLongLinkMetadata } from '@/lib/generated/platform-api-v1/zod.gen';
import { useCreateOrganizationSolution } from '@/lib/hooks/use-organization';

const createSolutionFormSchema = z.object({
    image: z.string().trim(),
    name: z.string().trim(),
    description: z.string().trim(),
    envs: z.record(z.string(), z.string()),
});

type CreateSolutionInput = z.input<typeof createSolutionFormSchema>;

const defaultCreateSolutionValues: CreateSolutionInput = {
    image: '',
    name: '',
    description: '',
    envs: {},
};

/** Renders the create-solution dialog for an organization. */
export default function CreateSolution({ organizationId }: { organizationId: string }) {
    const [open, setOpen] = useState(false);
    const [attempt, setAttempt] = useState(0);

    return (
        <>
            <Button
                label="Create Solution"
                isDisabled={organizationId.length === 0}
                clickAction={() => {
                    // Start fresh on opening; retain the previous dialog through its close effects.
                    setAttempt((current) => current + 1);
                    setOpen(true);
                }}
            />
            <CreateSolutionAttempt key={attempt} organizationId={organizationId} open={open} onOpenChange={setOpen} />
        </>
    );
}

/** Owns one wizard attempt, remaining mounted on close so Astryx restores trigger focus. */
function CreateSolutionAttempt({
    organizationId,
    open,
    onOpenChange,
}: {
    organizationId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const createSolution = useCreateOrganizationSolution(organizationId);
    const formId = useId();
    const [step, setStep] = useState<'image' | 'metadata' | 'envs'>('image');
    const submitting = useRef(false);
    const schema = createSolutionFormSchema.superRefine((value, ctx) => {
        // Only validate the current step on advance; validate everything before creation.
        if ((step === 'image' || step === 'envs') && value.image.length === 0) {
            ctx.addIssue({ code: 'custom', path: ['image'], message: 'Required' });
        }
        if (step !== 'image' && value.name.length === 0) {
            ctx.addIssue({ code: 'custom', path: ['name'], message: 'Required' });
        }
        if (step === 'envs') {
            for (const env of declaredEnvironments) {
                if (env.required && (value.envs[env.name] ?? '').trim().length === 0) {
                    ctx.addIssue({ code: 'custom', path: ['envs', env.name], message: 'Required' });
                }
            }
        }
    });
    const form = useForm<CreateSolutionInput>({
        defaultValues: defaultCreateSolutionValues,
        // Validate trimmed metadata without changing the values sent to the API.
        resolver: zodResolver(schema, undefined, { raw: true }),
        mode: 'onChange',
        shouldUnregister: false,
    });
    const inspectImage = useMutation({
        mutationFn: async (payload: CreateSolutionInput) => {
            // Fetch image metadata before showing editable fields.
            const query = new URLSearchParams({ image: payload.image });
            return zLongLinkMetadata.parse(await api(`/api/v1/image?${query.toString()}`).json());
        },
        onMutate: (payload) => {
            // Discard metadata and registered dynamic fields from the previous inspection.
            form.unregister('envs');
            form.reset({ ...payload, description: '', envs: {} });
        },
        onSuccess: (metadata, payload) => {
            form.reset({
                ...payload,
                description: metadata.description ?? '',
                envs: Object.fromEntries((metadata.environments ?? []).map((env) => [env.name, ''])),
            });
            setStep('metadata');
        },
    });
    const declaredEnvironments = inspectImage.data?.environments ?? [];
    const [image, name, envs] = useWatch({ control: form.control, name: ['image', 'name', 'envs'] });
    const pending = form.formState.isSubmitting || inspectImage.isPending || createSolution.isPending;
    const hasImage = image.trim().length > 0;
    const hasName = name.trim().length > 0;
    const missingEnvs = declaredEnvironments.some((env) => env.required && (envs[env.name] ?? '').trim().length === 0);
    const stepTitle = step === 'image' ? 'Inspect image' : step === 'metadata' ? 'Review metadata' : 'Review envs';

    /** Guard validation and submission against repeated submits, including Enter. */
    async function handleSubmit() {
        if (submitting.current || pending) return;
        submitting.current = true;
        try {
            await form.handleSubmit(async (value) => {
                if (step === 'image') {
                    // Await inspection while the mutation cache reports failures.
                    await inspectImage.mutateAsync(value).catch(() => {});
                } else if (step === 'metadata') {
                    setStep('envs');
                } else {
                    await handleCreateSolution(value);
                }
            })();
        } finally {
            submitting.current = false;
        }
    }

    /** Create the solution after the image metadata has been reviewed. */
    async function handleCreateSolution(payload: CreateSolutionInput) {
        // Collect configured environment values, dropping empty fields.
        const envs: Record<string, string> = {};

        for (const [name, value] of Object.entries(payload.envs)) {
            if (value.length > 0) {
                envs[name] = value;
            }
        }

        // Submit the new solution and close the dialog on success.
        try {
            await createSolution.mutateAsync({
                name: payload.name,
                image: payload.image,
                description: payload.description.length > 0 ? payload.description : null,
                envs,
            });
            onOpenChange(false);
        } catch {
            // The mutation cache reports failures; preserve the wizard for retry.
        }
    }

    const handleOpenChange = createGuardedOpenChange(pending, (nextOpen) => {
        if (submitting.current) return;
        onOpenChange(nextOpen);
    });

    return (
        <Dialog
            isOpen={open}
            onOpenChange={handleOpenChange}
            purpose={pending ? 'required' : 'form'}
            title={stepTitle}
            width={step === 'envs' ? 520 : 640}
            maxHeight="calc(100dvh - 2rem)"
        >
            <form
                id={formId}
                noValidate
                onSubmit={(event) => {
                    event.preventDefault();
                    void handleSubmit();
                }}
            >
                <FormLayout>
                    {step === 'image' ? (
                        <Controller
                            control={form.control}
                            name="image"
                            render={({ field, fieldState }) => (
                                <TextInput
                                    label="Image"
                                    value={field.value}
                                    ref={field.ref}
                                    isDisabled={pending}
                                    status={
                                        fieldState.error
                                            ? { type: 'error', message: fieldState.error.message }
                                            : undefined
                                    }
                                    htmlName={field.name}
                                    isRequired
                                    placeholder="ghcr.io/longlink/dashboard:latest"
                                    onBlur={field.onBlur}
                                    onChange={(value) =>
                                        field.onChange(
                                            value.startsWith('docker pull ')
                                                ? value.slice('docker pull '.length)
                                                : value
                                        )
                                    }
                                />
                            )}
                        />
                    ) : step === 'metadata' ? (
                        <>
                            <Controller
                                control={form.control}
                                name="name"
                                render={({ field, fieldState }) => (
                                    <TextInput
                                        label="Name"
                                        value={field.value}
                                        ref={field.ref}
                                        isDisabled={pending}
                                        status={
                                            fieldState.error
                                                ? { type: 'error', message: fieldState.error.message }
                                                : undefined
                                        }
                                        htmlName={field.name}
                                        isRequired
                                        onBlur={field.onBlur}
                                        onChange={field.onChange}
                                    />
                                )}
                            />
                            <Controller
                                control={form.control}
                                name="description"
                                render={({ field, fieldState }) => (
                                    <TextInput
                                        label="Description"
                                        value={field.value}
                                        ref={field.ref}
                                        isDisabled={pending}
                                        status={
                                            fieldState.error
                                                ? { type: 'error', message: fieldState.error.message }
                                                : undefined
                                        }
                                        htmlName={field.name}
                                        isOptional
                                        placeholder="Dashboard solution"
                                        onBlur={field.onBlur}
                                        onChange={field.onChange}
                                    />
                                )}
                            />
                        </>
                    ) : (
                        declaredEnvironments.map((env) => (
                            <Controller
                                control={form.control}
                                key={env.name}
                                name={`envs.${env.name}`}
                                render={({ field, fieldState }) => (
                                    <TextInput
                                        label={env.name}
                                        value={field.value}
                                        ref={field.ref}
                                        isDisabled={pending}
                                        status={
                                            fieldState.error
                                                ? { type: 'error', message: fieldState.error.message }
                                                : undefined
                                        }
                                        htmlName={field.name}
                                        isOptional={!env.required}
                                        isRequired={env.required}
                                        placeholder={env.description ?? `Enter ${env.name}`}
                                        onBlur={field.onBlur}
                                        onChange={field.onChange}
                                    />
                                )}
                            />
                        ))
                    )}
                </FormLayout>
            </form>
            {step === 'image' ? (
                <Stack direction="horizontal" gap={2} justify="end">
                    <Button
                        label="Cancel"
                        variant="ghost"
                        isDisabled={pending}
                        clickAction={() => handleOpenChange(false)}
                    />
                    <Button
                        form={formId}
                        type="submit"
                        label={inspectImage.isPending ? 'Inspecting...' : 'Inspect image'}
                        variant="primary"
                        isDisabled={pending || !hasImage}
                        isLoading={inspectImage.isPending}
                    />
                </Stack>
            ) : (
                <Stack direction="horizontal" gap={2} justify="between" wrap="wrap">
                    <Button
                        label="Back"
                        variant="ghost"
                        isDisabled={pending}
                        clickAction={() => setStep(step === 'metadata' ? 'image' : 'metadata')}
                    />
                    <Stack direction="horizontal" gap={2}>
                        <Button
                            label="Cancel"
                            variant="ghost"
                            isDisabled={pending}
                            clickAction={() => handleOpenChange(false)}
                        />
                        <Button
                            form={formId}
                            type="submit"
                            label={step === 'metadata' ? 'Next' : createSolution.isPending ? 'Creating...' : 'Create'}
                            variant="primary"
                            isDisabled={pending || !hasName || (step === 'envs' && missingEnvs)}
                            isLoading={step === 'metadata' ? undefined : createSolution.isPending}
                        />
                    </Stack>
                </Stack>
            )}
        </Dialog>
    );
}
