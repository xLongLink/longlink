import { Button } from '@astryxdesign/core/Button';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { FieldStatus } from '@astryxdesign/core/FieldStatus';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { useTranslator } from '@astryxdesign/core/i18n';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { Selector } from '@astryxdesign/core/Selector';
import { Stack } from '@astryxdesign/core/Stack';
import { TextInput } from '@astryxdesign/core/TextInput';
import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { useApiQuery } from '@/hooks/use-api';
import { useCreateOrganizationApplication } from '@/hooks/use-organization';
import { useToast } from '@/hooks/use-toast';
import { ApiError, fetchApiJson } from '@/lib/api';
import { zIcon, zLongLinkMetadata } from '@/lib/generated/platform-api-v1/zod.gen';
import { ICON_NAMES, isIconName, type IconName } from '@/lib/icons';
import { platformApiPath } from '@/lib/platform-api';
import type { ApiImageMetadata } from '@/lib/types';

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
    const t = useTranslator();
    const toast = useToast();
    const createApplication = useCreateOrganizationApplication(organizationId);
    const isCreatingApplication = createApplication.isPending;
    const formId = useId();
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<'image' | 'metadata' | 'envs'>('image');
    const [declaredEnvironments, setDeclaredEnvironments] = useState<NonNullable<ApiImageMetadata['environments']>>([]);
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
    const { data: iconCatalog } = useApiQuery<IconName[]>(open ? platformApiPath('/icons') : null, {
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
            const metadata = await fetchApiJson(platformApiPath(`/image?${query.toString()}`), undefined, (value) =>
                zLongLinkMetadata.parse(value)
            );

            setDeclaredEnvironments(metadata.environments ?? []);
            form.setValue('name', metadata.title ?? '', { shouldValidate: true });
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
                    body: inspectError instanceof Error ? inspectError.message : t('dialogs.inspectImageFailed'),
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
            setError(t('dialogs.createApplicationFailed'));
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
                icon: application.data.icon.length > 0 ? application.data.icon : null,
                envs,
            });
            setOpen(false);
            resetDialogState();
        } catch (mutationError) {
            toast({
                body: mutationError instanceof Error ? mutationError.message : t('dialogs.createApplicationFailed'),
                type: 'error',
            });
        }
    }

    /** Updates dialog state while protecting image inspection or application creation. */
    function handleOpenChange(nextOpen: boolean) {
        if (!nextOpen && (isInspecting || isCreatingApplication)) {
            return;
        }
        setOpen(nextOpen);
        if (!nextOpen) {
            resetDialogState();
        }
    }

    return (
        <>
            <Button
                label={t('actions.create')}
                isDisabled={organizationId.length === 0}
                clickAction={() => setOpen(true)}
            />

            <Dialog
                isOpen={open}
                onOpenChange={handleOpenChange}
                purpose={isInspecting || isCreatingApplication ? 'required' : 'form'}
                width={step === 'envs' ? 520 : 640}
                maxHeight="calc(100dvh - 2rem)"
            >
                <Layout
                    header={
                        <DialogHeader
                            title={
                                step === 'image'
                                    ? t('dialogs.inspectImage')
                                    : step === 'metadata'
                                      ? t('dialogs.reviewMetadata')
                                      : t('dialogs.reviewEnvs')
                            }
                            subtitle={`${t('dialogs.stepImage')} / ${t('dialogs.stepMetadata')} / ${t(
                                'dialogs.stepEnvs'
                            )}`}
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
                                                    label={t('labels.image')}
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
                                                    label={t('labels.name')}
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
                                                    label={t('labels.description')}
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
                                            label={t('labels.icon')}
                                            options={[
                                                { value: '__none__', label: t('dialogs.none') },
                                                ...(iconCatalog ?? []).map((name) => ({ value: name, label: name })),
                                            ]}
                                            value={icon}
                                            placeholder={t('dialogs.chooseIcon')}
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
                                                        placeholder={
                                                            env.description ??
                                                            t('dialogs.enterEnvironment', { name: env.name })
                                                        }
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
                                        label={t('actions.cancel')}
                                        variant="ghost"
                                        isDisabled={isInspecting}
                                        clickAction={() => handleOpenChange(false)}
                                    />
                                    <Button
                                        form={formId}
                                        type="submit"
                                        label={isInspecting ? t('dialogs.inspecting') : t('dialogs.inspectImage')}
                                        variant="primary"
                                        isDisabled={!hasImage}
                                        isLoading={isInspecting}
                                    />
                                </Stack>
                            ) : step === 'metadata' ? (
                                <Stack direction="horizontal" gap={2} justify="between" wrap="wrap">
                                    <Button
                                        label={t('actions.back')}
                                        variant="ghost"
                                        clickAction={() => {
                                            setStep('image');
                                            setError(null);
                                        }}
                                    />
                                    <Stack direction="horizontal" gap={2}>
                                        <Button
                                            label={t('actions.cancel')}
                                            variant="ghost"
                                            clickAction={() => handleOpenChange(false)}
                                        />
                                        <Button
                                            form={formId}
                                            type="submit"
                                            label={t('actions.next')}
                                            variant="primary"
                                            isDisabled={!hasRequiredMetadata}
                                        />
                                    </Stack>
                                </Stack>
                            ) : (
                                <Stack direction="horizontal" gap={2} justify="between" wrap="wrap">
                                    <Button
                                        label={t('actions.back')}
                                        variant="ghost"
                                        isDisabled={isCreatingApplication}
                                        clickAction={() => {
                                            setStep('metadata');
                                            setError(null);
                                        }}
                                    />
                                    <Stack direction="horizontal" gap={2}>
                                        <Button
                                            label={t('actions.cancel')}
                                            variant="ghost"
                                            isDisabled={isCreatingApplication}
                                            clickAction={() => handleOpenChange(false)}
                                        />
                                        <Button
                                            form={formId}
                                            type="submit"
                                            label={isCreatingApplication ? t('actions.creating') : t('actions.create')}
                                            variant="primary"
                                            isDisabled={!hasRequiredMetadata || !form.formState.isValid}
                                            isLoading={isCreatingApplication}
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
