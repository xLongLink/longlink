import { Button } from '@astryxdesign/core/Button';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { useTranslator } from '@astryxdesign/core/i18n';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { Stack } from '@astryxdesign/core/Stack';
import { TextInput } from '@astryxdesign/core/TextInput';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { fetchApiJson } from '@/lib/api';
import { zStorageRegistryResponse } from '@/lib/generated/platform-api-v1/zod.gen';
import { platformApiPath } from '@/lib/platform-api';
import { storagesQueryKey } from '@/lib/query-keys';

const schema = z.object({
    name: z.string().trim().min(1),
    endpoint_url: z.string().trim().url(),
    access_key_id: z.string().min(1),
    secret_access_key: z.string().min(1),
});

type Values = z.infer<typeof schema>;

/** Registers one Exoscale SOS backend. */
export default function CreateStorage() {
    const t = useTranslator();
    const toast = useToast();
    const queryClient = useQueryClient();
    const formId = useId();
    const [open, setOpen] = useState(false);
    const form = useForm<Values>({
        defaultValues: {
            name: '',
            endpoint_url: '',
            access_key_id: '',
            secret_access_key: '',
        },
        mode: 'onChange',
        resolver: zodResolver(schema),
    });
    const mutation = useMutation({
        mutationFn: (payload: Values) =>
            fetchApiJson(
                platformApiPath('/storages'),
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                },
                (value) => zStorageRegistryResponse.parse(value)
            ),
        onSuccess: () => {
            setOpen(false);
            form.reset();
            return queryClient.invalidateQueries({ queryKey: storagesQueryKey });
        },
    });

    /** Updates dialog state while protecting an in-flight registration. */
    function handleOpenChange(nextOpen: boolean) {
        if (!nextOpen && mutation.isPending) {
            return;
        }
        setOpen(nextOpen);
        if (!nextOpen) {
            form.reset();
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
                                    try {
                                        await mutation.mutateAsync(payload);
                                    } catch (mutationError) {
                                        toast({
                                            body:
                                                mutationError instanceof Error
                                                    ? mutationError.message
                                                    : t('dialogs.failedConnectStorage'),
                                            type: 'error',
                                        });
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
                                            <TextInput
                                                ref={field.ref}
                                                label={t('labels.secretAccessKey')}
                                                type="password"
                                                value={field.value}
                                                htmlName={field.name}
                                                isRequired
                                                onBlur={field.onBlur}
                                                onChange={field.onChange}
                                            />
                                        )}
                                    />
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
