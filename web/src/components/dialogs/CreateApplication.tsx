import { z } from 'zod';
import { X } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Text } from '@astryxdesign/core/Text';
import { useForm } from '@tanstack/react-form';
import { useToast } from '@/lib/hooks/use-toast';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Dialog } from '@astryxdesign/core/Dialog';
import { Heading } from '@astryxdesign/core/Heading';
import { createGuardedOpenChange } from '@/lib/utils';
import { useId, useState, type FormEvent } from 'react';
import { TextInput } from '@astryxdesign/core/TextInput';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { FieldStatus } from '@astryxdesign/core/FieldStatus';
import { zLongLinkMetadata } from '@/lib/generated/platform-api-v1/zod.gen';
import { useCreateOrganizationApplication } from '@/lib/hooks/use-organization';
import type { LongLinkMetadata } from '@/lib/generated/platform-api-v1/types.gen';
import { Layout, LayoutContent, LayoutFooter, LayoutHeader } from '@astryxdesign/core/Layout';

const createApplicationFormSchema = z.object({
    image: z.string().trim().min(1),
    name: z.string().trim(),
    description: z.string().trim(),
    envs: z.record(z.string(), z.string().optional()),
});

type CreateApplicationInput = z.input<typeof createApplicationFormSchema>;

const defaultCreateApplicationValues: CreateApplicationInput = {
    image: '',
    name: '',
    description: '',
    envs: {},
};

/** Renders a dialog header with its title and progress text kept together. */
function CompactDialogHeader({ title, onOpenChange }: { title: string; onOpenChange: (isOpen: boolean) => void }) {
    return (
        <LayoutHeader hasDivider>
            <Stack direction="horizontal" hAlign="between" vAlign="start">
                <Stack>
                    <Heading level={2}>{title}</Heading>
                    <Text size="sm" color="secondary">
                        1. Image / 2. Metadata / 3. Envs
                    </Text>
                </Stack>
                <Button
                    variant="ghost"
                    label="Close"
                    tooltip="Close"
                    icon={<X />}
                    isIconOnly
                    clickAction={() => onOpenChange(false)}
                />
            </Stack>
        </LayoutHeader>
    );
}

/** Renders the create-application dialog for an organization. */
export default function CreateApplication({ organizationId }: { organizationId: string }) {
    const toast = useToast();
    const createApplication = useCreateOrganizationApplication(organizationId);
    const formId = useId();
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<'image' | 'metadata' | 'envs'>('image');
    const [declaredEnvironments, setDeclaredEnvironments] = useState<NonNullable<LongLinkMetadata['environments']>>([]);
    const [isInspecting, setIsInspecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const form = useForm({
        defaultValues: defaultCreateApplicationValues,
        validators: {
            onChange: createApplicationFormSchema,
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
                await handleCreateApp(value);
            }
        },
    });
    const errorStatus = error ? <FieldStatus type="error" message={error} variant="detached" /> : null;

    /** Reset the dialog state when the flow closes or completes. */
    function resetDialogState() {
        setStep('image');
        form.reset(defaultCreateApplicationValues);
        setError(null);
    }

    /** Submits the form without navigating the browser. */
    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        void form.handleSubmit();
    }

    /** Inspect the image and advance to the app details step. */
    async function handleInspectImage(payload: CreateApplicationInput) {
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
            } else {
                toast({
                    body: inspectError instanceof Error ? inspectError.message : 'Failed to inspect image',
                    type: 'error',
                });
            }
        } finally {
            setIsInspecting(false);
        }
    }

    /** Create the app after the image metadata has been reviewed. */
    async function handleCreateApp(payload: CreateApplicationInput) {
        setError(null);

        // Collect configured environment values, dropping unset and empty fields.
        const envs: Record<string, string> = {};

        for (const [name, value] of Object.entries(payload.envs)) {
            if (value !== undefined && value.length > 0) {
                envs[name] = value;
            }
        }

        // Submit the new app and close the dialog on success.
        try {
            await createApplication.mutateAsync({
                name: payload.name,
                image: payload.image,
                description: payload.description.length > 0 ? payload.description : null,
                envs,
            });
            setOpen(false);
            resetDialogState();
        } catch (mutationError) {
            toast({
                body: mutationError instanceof Error ? mutationError.message : 'Failed to create application',
                type: 'error',
            });
        }
    }

    const handleOpenChange = createGuardedOpenChange(isInspecting || createApplication.isPending, (nextOpen) => {
        setOpen(nextOpen);

        // Reset the wizard once the dialog is fully closed.
        if (!nextOpen) {
            resetDialogState();
        }
    });

    return (
        <>
            <Button
                label="Create Application"
                isDisabled={organizationId.length === 0}
                clickAction={() => setOpen(true)}
            />

            <form.Subscribe selector={(state) => [state.values.image, state.values.name, state.isValid] as const}>
                {([image, name, isValid]) => {
                    const hasImage = image.trim().length > 0;
                    const hasName = name.trim().length > 0;

                    return (
                        <Dialog
                            isOpen={open}
                            onOpenChange={handleOpenChange}
                            aria-label={
                                step === 'image'
                                    ? 'Inspect image'
                                    : step === 'metadata'
                                      ? 'Review metadata'
                                      : 'Review envs'
                            }
                            purpose={isInspecting || createApplication.isPending ? 'required' : 'form'}
                            width={step === 'envs' ? 520 : 640}
                            maxHeight="calc(100dvh - 2rem)"
                        >
                            <Layout
                                header={
                                    <CompactDialogHeader
                                        title={
                                            step === 'image'
                                                ? 'Inspect image'
                                                : step === 'metadata'
                                                  ? 'Review metadata'
                                                  : 'Review envs'
                                        }
                                        onOpenChange={handleOpenChange}
                                    />
                                }
                                content={
                                    <LayoutContent>
                                        <form id={formId} onSubmit={handleSubmit}>
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
                                                                    placeholder="Dashboard app"
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
                                                {errorStatus}
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
                                                    isDisabled={createApplication.isPending}
                                                    clickAction={() => {
                                                        setStep('metadata');
                                                        setError(null);
                                                    }}
                                                />
                                                <Stack direction="horizontal" gap={2}>
                                                    <Button
                                                        label="Cancel"
                                                        variant="ghost"
                                                        isDisabled={createApplication.isPending}
                                                        clickAction={() => handleOpenChange(false)}
                                                    />
                                                    <Button
                                                        form={formId}
                                                        type="submit"
                                                        label={createApplication.isPending ? 'Creating...' : 'Create'}
                                                        variant="primary"
                                                        isDisabled={!hasName || !isValid}
                                                        isLoading={createApplication.isPending}
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
