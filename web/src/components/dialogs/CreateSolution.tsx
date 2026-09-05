import { z } from 'zod';
import { api, ApiError } from '@/lib/api';
import { useForm } from '@tanstack/react-form';
import { useToast } from '@/lib/hooks/use-toast';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { createGuardedOpenChange } from '@/lib/utils';
import { useId, useState, type FormEvent } from 'react';
import { TextInput } from '@astryxdesign/core/TextInput';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { FieldStatus } from '@astryxdesign/core/FieldStatus';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { zLongLinkMetadata } from '@/lib/generated/platform-api-v1/zod.gen';
import { useCreateOrganizationSolution } from '@/lib/hooks/use-organization';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import type { LongLinkMetadata } from '@/lib/generated/platform-api-v1/types.gen';

const createSolutionFormSchema = z.object({
    image: z.string().trim().min(1),
    name: z.string().trim(),
    description: z.string().trim(),
    envs: z.record(z.string(), z.string().optional()),
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
    const form = useForm({
        defaultValues: defaultCreateSolutionValues,
        validators: {
            onChange: createSolutionFormSchema,
        },
        onSubmit: async ({ value }) => {
            if (step === 'image') {
                await handleInspectImage(value);
            } else if (step === 'metadata') {
                // Advance only after required metadata is present.
                if (value.name.trim().length > 0) {
                    setStep('envs');
                }
            } else {
                await handleCreateSolution(value);
            }
        },
    });

    /** Reset the dialog state when the flow closes or completes. */
    function resetDialogState() {
        setStep('image');
        form.reset(defaultCreateSolutionValues);
        setError(null);
    }

    /** Inspect the image and advance to the solution details step. */
    async function handleInspectImage(payload: CreateSolutionInput) {
        setError(null);
        setIsInspecting(true);

        // Fetch image metadata before showing editable fields.
        try {
            const query = new URLSearchParams({ image: payload.image });
            const metadata = zLongLinkMetadata.parse(await api(`/api/v1/image?${query.toString()}`).json());

            setDeclaredEnvironments(metadata.environments ?? []);
            form.setFieldValue('description', metadata.description ?? '');
            form.setFieldValue('envs', {});
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

        // Collect configured environment values, dropping unset and empty fields.
        const envs: Record<string, string> = {};

        for (const [name, value] of Object.entries(payload.envs)) {
            if (value !== undefined && value.length > 0) {
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

    const handleOpenChange = createGuardedOpenChange(isInspecting || createSolution.isPending, (nextOpen) => {
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

            <form.Subscribe selector={(state) => [state.values.image, state.values.name, state.isValid] as const}>
                {([image, name, isValid]) => {
                    const hasImage = image.trim().length > 0;
                    const hasName = name.trim().length > 0;
                    const stepTitle =
                        step === 'image' ? 'Inspect image' : step === 'metadata' ? 'Review metadata' : 'Review envs';

                    return (
                        <Dialog
                            isOpen={open}
                            onOpenChange={handleOpenChange}
                            aria-label={stepTitle}
                            purpose={isInspecting || createSolution.isPending ? 'required' : 'form'}
                            width={step === 'envs' ? 520 : 640}
                            maxHeight="calc(100dvh - 2rem)"
                        >
                            <Layout
                                header={<DialogHeader hasDivider title={stepTitle} onOpenChange={handleOpenChange} />}
                                content={
                                    <LayoutContent>
                                        <form
                                            id={formId}
                                            onSubmit={(event: FormEvent<HTMLFormElement>) => {
                                                event.preventDefault();
                                                void form.handleSubmit();
                                            }}
                                        >
                                            <FormLayout>
                                                {step === 'image' ? (
                                                    <form.Field name="image">
                                                        {(field) => (
                                                            <TextInput
                                                                label="Image"
                                                                value={field.state.value}
                                                                htmlName={field.name}
                                                                isRequired
                                                                placeholder="ghcr.io/longlink/dashboard:latest"
                                                                onBlur={field.handleBlur}
                                                                onChange={(value) =>
                                                                    field.handleChange(
                                                                        value.startsWith('docker pull ')
                                                                            ? value.slice('docker pull '.length)
                                                                            : value
                                                                    )
                                                                }
                                                            />
                                                        )}
                                                    </form.Field>
                                                ) : step === 'metadata' ? (
                                                    <>
                                                        <form.Field name="name">
                                                            {(field) => (
                                                                <TextInput
                                                                    label="Name"
                                                                    value={field.state.value}
                                                                    htmlName={field.name}
                                                                    isRequired
                                                                    onBlur={field.handleBlur}
                                                                    onChange={field.handleChange}
                                                                />
                                                            )}
                                                        </form.Field>
                                                        <form.Field name="description">
                                                            {(field) => (
                                                                <TextInput
                                                                    label="Description"
                                                                    value={field.state.value}
                                                                    htmlName={field.name}
                                                                    isOptional
                                                                    placeholder="Dashboard solution"
                                                                    onBlur={field.handleBlur}
                                                                    onChange={field.handleChange}
                                                                />
                                                            )}
                                                        </form.Field>
                                                    </>
                                                ) : (
                                                    declaredEnvironments.map((env) => (
                                                        <form.Field
                                                            key={env.name}
                                                            name={`envs.${env.name}` as `envs.${string}`}
                                                            validators={{
                                                                onChange: ({ value }) =>
                                                                    env.required && (value ?? '').trim().length === 0
                                                                        ? 'Required'
                                                                        : undefined,
                                                            }}
                                                        >
                                                            {(field) => (
                                                                <TextInput
                                                                    label={env.name}
                                                                    value={field.state.value ?? ''}
                                                                    htmlName={field.name}
                                                                    isOptional={!env.required}
                                                                    isRequired={env.required}
                                                                    placeholder={env.description ?? `Enter ${env.name}`}
                                                                    onBlur={field.handleBlur}
                                                                    onChange={field.handleChange}
                                                                />
                                                            )}
                                                        </form.Field>
                                                    ))
                                                )}
                                                {error ? (
                                                    <FieldStatus type="error" message={error} variant="detached" />
                                                ) : null}
                                            </FormLayout>
                                        </form>
                                    </LayoutContent>
                                }
                                footer={
                                    <LayoutFooter>
                                        {step === 'image' ? (
                                            <Stack direction="horizontal" gap={2} justify="end">
                                                <Button
                                                    label="Cancel"
                                                    variant="ghost"
                                                    isDisabled={isInspecting}
                                                    clickAction={() => handleOpenChange(false)}
                                                />
                                                <Button
                                                    form={formId}
                                                    type="submit"
                                                    label={isInspecting ? 'Inspecting...' : 'Inspect image'}
                                                    variant="primary"
                                                    isDisabled={!hasImage}
                                                    isLoading={isInspecting}
                                                />
                                            </Stack>
                                        ) : step === 'metadata' ? (
                                            <Stack direction="horizontal" gap={2} justify="between" wrap="wrap">
                                                <Button
                                                    label="Back"
                                                    variant="ghost"
                                                    clickAction={() => {
                                                        setStep('image');
                                                        setError(null);
                                                    }}
                                                />
                                                <Stack direction="horizontal" gap={2}>
                                                    <Button
                                                        label="Cancel"
                                                        variant="ghost"
                                                        clickAction={() => handleOpenChange(false)}
                                                    />
                                                    <Button
                                                        form={formId}
                                                        type="submit"
                                                        label="Next"
                                                        variant="primary"
                                                        isDisabled={!hasName}
                                                    />
                                                </Stack>
                                            </Stack>
                                        ) : (
                                            <Stack direction="horizontal" gap={2} justify="between" wrap="wrap">
                                                <Button
                                                    label="Back"
                                                    variant="ghost"
                                                    isDisabled={createSolution.isPending}
                                                    clickAction={() => {
                                                        setStep('metadata');
                                                        setError(null);
                                                    }}
                                                />
                                                <Stack direction="horizontal" gap={2}>
                                                    <Button
                                                        label="Cancel"
                                                        variant="ghost"
                                                        isDisabled={createSolution.isPending}
                                                        clickAction={() => handleOpenChange(false)}
                                                    />
                                                    <Button
                                                        form={formId}
                                                        type="submit"
                                                        label={createSolution.isPending ? 'Creating...' : 'Create'}
                                                        variant="primary"
                                                        isDisabled={!hasName || !isValid}
                                                        isLoading={createSolution.isPending}
                                                    />
                                                </Stack>
                                            </Stack>
                                        )}
                                    </LayoutFooter>
                                }
                            />
                        </Dialog>
                    );
                }}
            </form.Subscribe>
        </>
    );
}
