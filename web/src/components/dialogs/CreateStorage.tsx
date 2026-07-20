import { z } from 'zod';
import { useId, useState } from 'react';
import { Grid } from '@astryxdesign/core/Grid';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { zodResolver } from '@hookform/resolvers/zod';
import { Selector } from '@astryxdesign/core/Selector';
import { TextInput } from '@astryxdesign/core/TextInput';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { FieldStatus } from '@astryxdesign/core/FieldStatus';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { fetchApiJson } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { useUserProfile } from '@/hooks/use-user';
import { apiStorageRegistrySchema, parseApiResponse } from '@/lib/api-schemas';
import { infrastructureOptionsQueryKey, storagesQueryKey } from '@/lib/query-keys';

const configurationSchema = z.object({
    name: z.string().trim().min(1),
    endpoint_url: z.string().trim().url(),
    runtime_endpoint_url: z.union([z.literal(''), z.string().trim().url()]),
});

const schema = z.discriminatedUnion('kind', [
    configurationSchema.extend({
        kind: z.literal('minio'),
        access_key_id: z.string().trim().min(1),
        secret_access_key: z.string().min(1),
    }),
    configurationSchema.extend({
        kind: z.literal('exoscale'),
        access_key_id: z.literal(''),
        secret_access_key: z.literal(''),
    }),
]);

type Values = z.infer<typeof schema>;

/** Registers one object-storage backend. */
export default function CreateStorage() {
    const { t } = useTranslation();
    const { role } = useUserProfile();
    const queryClient = useQueryClient();
    const formId = useId();
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const form = useForm<Values>({
        defaultValues: {
            name: '',
            kind: 'exoscale',
            endpoint_url: '',
            runtime_endpoint_url: '',
            access_key_id: '',
            secret_access_key: '',
        },
        mode: 'onChange',
        resolver: zodResolver(schema),
    });
    const kind = useWatch({ control: form.control, name: 'kind' });
    const mutation = useMutation({
        mutationFn: async (payload: Values) =>
            fetchApiJson(
                '/api/storages',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...payload,
                        runtime_endpoint_url: payload.runtime_endpoint_url || null,
                        access_key_id: payload.kind === 'minio' ? payload.access_key_id : null,
                        secret_access_key: payload.kind === 'minio' ? payload.secret_access_key : null,
                    }),
                },
                (value) => parseApiResponse(apiStorageRegistrySchema, value)
            ),
        onSuccess: async () => {
            setOpen(false);
            resetDialogState();
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: storagesQueryKey() }),
                queryClient.invalidateQueries({ queryKey: infrastructureOptionsQueryKey() }),
            ]);
        },
    });

    // Only administrators can register infrastructure.
    if (role !== 'administrator') {
        return null;
    }

    /** Clears connection secrets and errors when the dialog closes. */
    function resetDialogState() {
        form.reset();
        setError(null);
        setPasswordVisible(false);
    }

    /** Updates dialog state while protecting an in-flight registration. */
    function handleOpenChange(nextOpen: boolean) {
        if (!nextOpen && mutation.isPending) {
            return;
        }
        setOpen(nextOpen);
        if (!nextOpen) {
            resetDialogState();
        }
    }

    return (
        <>
            <Button label={t('dialogs.connectStorageTitle')} clickAction={() => setOpen(true)} />
            <Dialog
                isOpen={open}
                onOpenChange={handleOpenChange}
                purpose={mutation.isPending ? 'required' : 'form'}
                width={520}
                maxHeight="calc(100dvh - 2rem)"
            >
                <Layout
                    header={
                        <DialogHeader
                            title={t('dialogs.connectStorageTitle')}
                            subtitle={t('dialogs.connectStorageDescription')}
                            onOpenChange={handleOpenChange}
                        />
                    }
                    content={
                        <LayoutContent>
                            <form
                                id={formId}
                                onSubmit={form.handleSubmit(async (payload) => {
                                    setError(null);
                                    try {
                                        await mutation.mutateAsync(payload);
                                    } catch (mutationError) {
                                        setError(
                                            mutationError instanceof Error
                                                ? mutationError.message
                                                : t('dialogs.failedConnectStorage')
                                        );
                                    }
                                })}
                            >
                                <FormLayout>
                                    <Grid columns={{ minWidth: 180, max: 2, repeat: 'fit' }} gap={4}>
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
                                                    onBlur={field.onBlur}
                                                    onChange={field.onChange}
                                                />
                                            )}
                                        />
                                        <Selector
                                            label={t('labels.kind')}
                                            options={[
                                                { value: 'exoscale', label: 'Exoscale SOS' },
                                                { value: 'minio', label: 'MinIO' },
                                            ]}
                                            value={kind}
                                            isRequired
                                            onChange={(value) => {
                                                if (value === 'minio' || value === 'exoscale') {
                                                    form.setValue('kind', value, {
                                                        shouldDirty: true,
                                                        shouldValidate: true,
                                                    });

                                                    // Remove local credentials when switching to Platform-managed Exoscale.
                                                    if (value === 'exoscale') {
                                                        form.setValue('access_key_id', '', { shouldValidate: true });
                                                        form.setValue('secret_access_key', '', {
                                                            shouldValidate: true,
                                                        });
                                                        setPasswordVisible(false);
                                                    }
                                                }
                                            }}
                                        />
                                    </Grid>
                                    <Controller
                                        control={form.control}
                                        name="endpoint_url"
                                        render={({ field }) => (
                                            <TextInput
                                                ref={field.ref}
                                                label={t('labels.endpointUrl')}
                                                value={field.value}
                                                htmlName={field.name}
                                                isRequired
                                                placeholder={
                                                    kind === 'exoscale'
                                                        ? 'https://sos-ch-dk-2.exo.io'
                                                        : 'http://localhost:19000'
                                                }
                                                onBlur={field.onBlur}
                                                onChange={field.onChange}
                                            />
                                        )}
                                    />
                                    <Controller
                                        control={form.control}
                                        name="runtime_endpoint_url"
                                        render={({ field }) => (
                                            <TextInput
                                                ref={field.ref}
                                                label={t('labels.runtimeEndpointUrl')}
                                                value={field.value}
                                                htmlName={field.name}
                                                isOptional
                                                onBlur={field.onBlur}
                                                onChange={field.onChange}
                                            />
                                        )}
                                    />
                                    {kind === 'minio' ? (
                                        <>
                                            <Controller
                                                control={form.control}
                                                name="access_key_id"
                                                render={({ field }) => (
                                                    <TextInput
                                                        ref={field.ref}
                                                        label={t('labels.accessKeyId')}
                                                        value={field.value}
                                                        htmlName={field.name}
                                                        isRequired
                                                        onBlur={field.onBlur}
                                                        onChange={field.onChange}
                                                    />
                                                )}
                                            />
                                            <Controller
                                                control={form.control}
                                                name="secret_access_key"
                                                render={({ field }) => (
                                                    <Stack gap={1}>
                                                        <TextInput
                                                            ref={field.ref}
                                                            label={t('labels.secretAccessKey')}
                                                            type={passwordVisible ? 'text' : 'password'}
                                                            value={field.value}
                                                            htmlName={field.name}
                                                            isRequired
                                                            onBlur={field.onBlur}
                                                            onChange={field.onChange}
                                                        />
                                                        <Button
                                                            label={
                                                                passwordVisible
                                                                    ? t('auth.hidePassword')
                                                                    : t('auth.showPassword')
                                                            }
                                                            variant="ghost"
                                                            size="sm"
                                                            aria-pressed={passwordVisible}
                                                            clickAction={() =>
                                                                setPasswordVisible((current) => !current)
                                                            }
                                                        />
                                                    </Stack>
                                                )}
                                            />
                                        </>
                                    ) : null}
                                    {error ? <FieldStatus type="error" message={error} variant="detached" /> : null}
                                </FormLayout>
                            </form>
                        </LayoutContent>
                    }
                    footer={
                        <LayoutFooter>
                            <Stack direction="horizontal" gap={2} justify="end">
                                <Button
                                    label={t('actions.cancel')}
                                    variant="ghost"
                                    isDisabled={mutation.isPending}
                                    clickAction={() => handleOpenChange(false)}
                                />
                                <Button
                                    form={formId}
                                    type="submit"
                                    label={mutation.isPending ? t('actions.creating') : t('actions.create')}
                                    variant="primary"
                                    isDisabled={!form.formState.isValid}
                                    isLoading={mutation.isPending}
                                />
                            </Stack>
                        </LayoutFooter>
                    }
                />
            </Dialog>
        </>
    );
}
