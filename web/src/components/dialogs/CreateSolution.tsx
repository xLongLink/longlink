import { z } from 'zod';
import { api, ApiError } from '@/lib/api';
import { Dialog } from '@/components/ui/Dialog';
import { useId, useRef, useState } from 'react';
import { useToast } from '@/lib/hooks/use-toast';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { createGuardedOpenChange } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { TextInput } from '@astryxdesign/core/TextInput';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { FieldStatus } from '@astryxdesign/core/FieldStatus';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zLongLinkMetadata } from '@/lib/generated/platform-api-v1/zod.gen';
import { useCreateOrganizationSolution } from '@/lib/hooks/use-organization';
import type { LongLinkMetadata } from '@/lib/generated/platform-api-v1/types.gen';

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
    const toast = useToast();
    const createSolution = useCreateOrganizationSolution(organizationId);
    const formId = useId();
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<'image' | 'metadata' | 'envs'>('image');
    const [declaredEnvironments, setDeclaredEnvironments] = useState<NonNullable<LongLinkMetadata['environments']>>([]);
    const [isInspecting, setIsInspecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
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
    const [image, name, envs] = useWatch({ control: form.control, name: ['image', 'name', 'envs'] });
    const pending = form.formState.isSubmitting || isInspecting || createSolution.isPending;
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
                    await handleInspectImage(value);
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

    /** Reset the dialog state when the flow closes or completes. */
    function resetDialogState() {
        setStep('image');
        form.reset(defaultCreateSolutionValues);
        setDeclaredEnvironments([]);
        setError(null);
    }

    /** Inspect the image and advance to the solution details step. */
    async function handleInspectImage(payload: CreateSolutionInput) {
        setError(null);
        setIsInspecting(true);

        // Discard metadata and registered dynamic fields from the previous inspection.
        setDeclaredEnvironments([]);
        form.unregister('envs');
        form.reset({ ...payload, description: '', envs: {} });

        // Fetch image metadata before showing editable fields.
        try {
            const query = new URLSearchParams({ image: payload.image });
            const metadata = zLongLinkMetadata.parse(await api(`/api/v1/image?${query.toString()}`).json());

            setDeclaredEnvironments(metadata.environments ?? []);
            form.reset({
                ...payload,
                description: metadata.description ?? '',
                envs: Object.fromEntries((metadata.environments ?? []).map((env) => [env.name, ''])),
            });
            setStep('metadata');
        } catch (inspectError) {
            // Keep image input and domain failures with the field; surface operational failures globally.
            if (
                inspectError instanceof ApiError &&
                inspectError.status >= 400 &&
                inspectError.status < 500 &&
                inspectError.status !== 401 &&
                inspectError.status !== 403 &&
                inspectError.status !== 429
            ) {
                setError(inspectError.message);
                return;
            }
            toast({
                body: inspectError instanceof Error ? inspectError.message : 'Failed to inspect image',
                type: 'error',
            });
        } finally {
            setIsInspecting(false);
        }
    }

    /** Create the solution after the image metadata has been reviewed. */
    async function handleCreateSolution(payload: CreateSolutionInput) {
        setError(null);

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
            setOpen(false);
            resetDialogState();
        } catch (mutationError) {
            toast({
                body: mutationError instanceof Error ? mutationError.message : 'Failed to create solution',
                type: 'error',
            });
        }
    }

    const handleOpenChange = createGuardedOpenChange(pending, (nextOpen) => {
        if (submitting.current) return;
        setOpen(nextOpen);

        // Reset the wizard once the dialog is fully closed.
        if (!nextOpen) {
            resetDialogState();
        }
    });

    return (
        <>
            <Button
                label="Create Solution"
                isDisabled={organizationId.length === 0}
                clickAction={() => setOpen(true)}
            />

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
                        {error ? <FieldStatus type="error" message={error} variant="detached" /> : null}
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
                            label={isInspecting ? 'Inspecting...' : 'Inspect image'}
                            variant="primary"
                            isDisabled={pending || !hasImage}
                            isLoading={isInspecting}
                        />
                    </Stack>
                ) : step === 'metadata' ? (
                    <Stack direction="horizontal" gap={2} justify="between" wrap="wrap">
                        <Button
                            label="Back"
                            variant="ghost"
                            isDisabled={pending}
                            clickAction={() => {
                                setStep('image');
                                setError(null);
                            }}
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
                                label="Next"
                                variant="primary"
                                isDisabled={pending || !hasName}
                            />
                        </Stack>
                    </Stack>
                ) : (
                    <Stack direction="horizontal" gap={2} justify="between" wrap="wrap">
                        <Button
                            label="Back"
                            variant="ghost"
                            isDisabled={pending}
                            clickAction={() => {
                                setStep('metadata');
                                setError(null);
                            }}
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
                                label={createSolution.isPending ? 'Creating...' : 'Create'}
                                variant="primary"
                                isDisabled={pending || !hasName || missingEnvs}
                                isLoading={createSolution.isPending}
                            />
                        </Stack>
                    </Stack>
                )}
            </Dialog>
        </>
    );
}
