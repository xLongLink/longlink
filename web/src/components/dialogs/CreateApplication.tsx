import { z } from 'zod';
import { useId, useState } from 'react';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { zodResolver } from '@hookform/resolvers/zod';
import { Selector } from '@astryxdesign/core/Selector';
import { TextInput } from '@astryxdesign/core/TextInput';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { FieldStatus } from '@astryxdesign/core/FieldStatus';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import type { LongLinkMetadata } from '@/lib/generated/platform-api-v1/types.gen';
import { useToast } from '@/lib/hooks/use-toast';
import { useApiQuery } from '@/lib/hooks/use-api';
import { ApiError, fetchApiJson } from '@/lib/api';
import { ICON_NAMES, isIconName, type IconName } from '@/lib/icons';
import { useCreateOrganizationApplication } from '@/lib/hooks/use-organization';
import { zIcon, zLongLinkMetadata } from '@/lib/generated/platform-api-v1/zod.gen';

const createApplicationFormSchema = z.object({
    image: z.string().trim().min(1),
    name: z.string().trim(),
    description: z.string().trim(),
    icon: z.union([z.literal(''), z.enum(ICON_NAMES)]),
    envs: z
        .record(z.string(), z.string().optional())
        .default({})
        .transform((envs) =>
            Object.entries(envs).reduce<Record<string, string>>((configured, [name, value]) => {
                if (value !== undefined) {
                    configured[name] = value;
                }
                return configured;
            }, {})
        ),
});

const createApplicationSubmitSchema = createApplicationFormSchema.extend({
    name: z.string().trim().min(1),
});

type CreateApplicationInput = z.input<typeof createApplicationFormSchema>;
type CreateApplicationValues = z.output<typeof createApplicationFormSchema>;

const defaultCreateApplicationValues = {
    image: '',
    name: '',
    description: '',
    icon: '',
    envs: {},
} satisfies CreateApplicationInput;

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
    const form = useForm<CreateApplicationInput, unknown, CreateApplicationValues>({
        defaultValues: defaultCreateApplicationValues,
        mode: 'onChange',
        resolver: zodResolver(createApplicationFormSchema),
    });
    const image = useWatch({ control: form.control, name: 'image' });
    const name = useWatch({ control: form.control, name: 'name' });
    const icon = useWatch({ control: form.control, name: 'icon' });
    const hasImage = image.trim().length > 0;
    const hasRequiredMetadata = hasImage && name.trim().length > 0;
    const errorStatus = error ? <FieldStatus type="error" message={error} variant="detached" /> : null;
    const { data: iconCatalog } = useApiQuery<IconName[]>(open ? '/api/v1/icons' : null, {
        parse: (value) => zIcon.array().parse(value),
        staleTime: Infinity,
    });

    /** Reset the dialog state when the flow closes or completes. */
    function resetDialogState() {
        setStep('image');
        form.reset(defaultCreateApplicationValues);
        setDeclaredEnvironments([]);
        setError(null);
    }

    /** Inspect the image and advance to the app details step. */
    async function handleInspectImage(payload: CreateApplicationValues) {
        setError(null);
        setIsInspecting(true);

        // Fetch image metadata before showing editable fields.
        try {
            const query = new URLSearchParams({ image: payload.image });
            const metadata = zLongLinkMetadata.parse(await fetchApiJson(`/api/v1/image?${query.toString()}`));

            setDeclaredEnvironments(metadata.environments ?? []);
            form.setValue('description', metadata.description ?? '', { shouldValidate: true });
            form.setValue('envs', {}, { shouldValidate: true });
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
    async function handleCreateApp(payload: CreateApplicationValues) {
        setError(null);

        const application = createApplicationSubmitSchema.safeParse(payload);
        // Stop before submission when required fields are invalid.
        if (!application.success) {
            setError('Failed to create application');
            return;
        }

        // Collect configured environment values while skipping optional empty fields.
        const envs = Object.fromEntries(Object.entries(application.data.envs).filter(([, value]) => value.length > 0));

        // Submit the new app and close the dialog on success.
        try {
            await createApplication.mutateAsync({
                name: application.data.name,
                image: application.data.image,
                description: application.data.description.length > 0 ? application.data.description : null,
                icon: isIconName(application.data.icon) ? application.data.icon : null,
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

    /** Updates dialog state while protecting image inspection or application creation. */
    function handleOpenChange(nextOpen: boolean) {
        if (!nextOpen && (isInspecting || createApplication.isPending)) {
            return;
        }
        setOpen(nextOpen);
        if (!nextOpen) {
            resetDialogState();
        }
    }

    return (
        <>
            <Button label="Create" isDisabled={organizationId.length === 0} clickAction={() => setOpen(true)} />

            <Dialog
                isOpen={open}
                onOpenChange={handleOpenChange}
                purpose={isInspecting || createApplication.isPending ? 'required' : 'form'}
                width={step === 'envs' ? 520 : 640}
                maxHeight="calc(100dvh - 2rem)"
            >
                <Layout
                    header={
                        <DialogHeader
                            title={
                                step === 'image'
                                    ? 'Inspect image'
                                    : step === 'metadata'
                                      ? 'Review metadata'
                                      : 'Review envs'
                            }
                            subtitle="1. Image / 2. Metadata / 3. Envs"
                            onOpenChange={handleOpenChange}
                        />
                    }
                    content={
                        <LayoutContent>
                            {step === 'image' ? (
                                <form id={formId} onSubmit={form.handleSubmit(handleInspectImage)}>
                                    <FormLayout>
                                        <Controller
                                            control={form.control}
                                            name="image"
                                            render={({ field }) => (
                                                <TextInput
                                                    ref={field.ref}
                                                    label="Image"
                                                    value={field.value}
                                                    htmlName={field.name}
                                                    isRequired
                                                    placeholder="ghcr.io/longlink/dashboard:latest"
                                                    onBlur={field.onBlur}
                                                    onChange={field.onChange}
                                                />
                                            )}
                                        />
                                        {errorStatus}
                                    </FormLayout>
                                </form>
                            ) : step === 'metadata' ? (
                                <form
                                    id={formId}
                                    onSubmit={(event) => {
                                        event.preventDefault();

                                        // Advance only after required metadata is present.
                                        if (hasRequiredMetadata) {
                                            setStep('envs');
                                        }
                                    }}
                                >
                                    <FormLayout>
                                        <Controller
                                            control={form.control}
                                            name="name"
                                            render={({ field }) => (
                                                <TextInput
                                                    ref={field.ref}
                                                    label="Name"
                                                    value={field.value}
                                                    htmlName={field.name}
                                                    isRequired
                                                    placeholder="dashboard"
                                                    onBlur={field.onBlur}
                                                    onChange={field.onChange}
                                                />
                                            )}
                                        />
                                        <Controller
                                            control={form.control}
                                            name="description"
                                            render={({ field }) => (
                                                <TextInput
                                                    ref={field.ref}
                                                    label="Description"
                                                    value={field.value}
                                                    htmlName={field.name}
                                                    isOptional
                                                    placeholder="Dashboard app"
                                                    onBlur={field.onBlur}
                                                    onChange={field.onChange}
                                                />
                                            )}
                                        />
                                        <Selector
                                            label="Icon"
                                            options={[
                                                { value: '__none__', label: 'None' },
                                                ...(iconCatalog ?? []).map((name) => ({ value: name, label: name })),
                                            ]}
                                            value={icon}
                                            placeholder="Choose an icon"
                                            isOptional
                                            onChange={(value) =>
                                                form.setValue('icon', isIconName(value) ? value : '', {
                                                    shouldDirty: true,
                                                    shouldValidate: true,
                                                })
                                            }
                                        />
                                        {errorStatus}
                                    </FormLayout>
                                </form>
                            ) : (
                                <form id={formId} onSubmit={form.handleSubmit(handleCreateApp)}>
                                    <FormLayout>
                                        {declaredEnvironments.map((env) => (
                                            <Controller
                                                key={env.name}
                                                control={form.control}
                                                name={`envs.${env.name}` as `envs.${string}`}
                                                rules={{ required: env.required }}
                                                render={({ field }) => (
                                                    <TextInput
                                                        ref={field.ref}
                                                        label={env.name}
                                                        value={field.value ?? ''}
                                                        htmlName={field.name}
                                                        isOptional={!env.required}
                                                        isRequired={env.required}
                                                        placeholder={env.description ?? `Enter ${env.name}`}
                                                        onBlur={field.onBlur}
                                                        onChange={field.onChange}
                                                    />
                                                )}
                                            />
                                        ))}
                                        {errorStatus}
                                    </FormLayout>
                                </form>
                            )}
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
                                            isDisabled={!hasRequiredMetadata}
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
                                            isDisabled={!hasRequiredMetadata || !form.formState.isValid}
                                            isLoading={createApplication.isPending}
                                        />
                                    </Stack>
                                </Stack>
                            )}
                        </LayoutFooter>
                    }
                />
            </Dialog>
        </>
    );
}
