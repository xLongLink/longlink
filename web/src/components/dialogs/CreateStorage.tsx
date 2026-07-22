import { z } from 'zod';
import { useId, useState } from 'react';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslator } from '@astryxdesign/core/i18n';
import { TextInput } from '@astryxdesign/core/TextInput';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { FieldStatus } from '@astryxdesign/core/FieldStatus';
import { Controller, useForm } from 'react-hook-form';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { fetchApiJson } from '@/lib/api';
import { useUserProfile } from '@/hooks/use-user';
import { apiStorageRegistrySchema, parseApiResponse } from '@/lib/api-schemas';
import { infrastructureOptionsQueryKey, storagesQueryKey } from '@/lib/query-keys';

const schema = z.object({
    name: z.string().trim().min(1),
    endpoint_url: z.string().trim().url(),
    runtime_endpoint_url: z.union([z.literal(''), z.string().trim().url()]),
});

type Values = z.infer<typeof schema>;

/** Registers one Exoscale SOS backend. */
export default function CreateStorage() {
    const t = useTranslator();
    const { role } = useUserProfile();
    const queryClient = useQueryClient();
    const formId = useId();
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const form = useForm<Values>({
        defaultValues: {
            name: '',
            endpoint_url: '',
            runtime_endpoint_url: '',
        },
        mode: 'onChange',
        resolver: zodResolver(schema),
    });
    const mutation = useMutation({
        mutationFn: async (payload: Values) =>
            fetchApiJson(
                '/api/storages',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...payload,
                        kind: 'exoscale',
                        runtime_endpoint_url: payload.runtime_endpoint_url || null,
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

    /** Clears form state and errors when the dialog closes. */
    function resetDialogState() {
        form.reset();
        setError(null);
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
                                                placeholder="https://sos-ch-dk-2.exo.io"
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
