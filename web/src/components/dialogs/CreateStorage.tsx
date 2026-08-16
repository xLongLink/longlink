import { z } from 'zod';
import { useId, useState } from 'react';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { TextInput } from '@astryxdesign/core/TextInput';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { fetchApiJson } from '@/lib/api';
import { useToast } from '@/lib/hooks/use-toast';
import { storagesQueryKey } from '@/lib/query-keys';
import { platformApiPath } from '@/lib/platform-api';
import { zStorageRegistryResponse } from '@/lib/generated/platform-api-v1/zod.gen';

const schema = z.object({
    name: z.string().trim().min(1),
    endpoint_url: z.string().trim().url(),
    access_key_id: z.string().min(1),
    secret_access_key: z.string().min(1),
});

type Values = z.infer<typeof schema>;

/** Registers one Exoscale SOS backend. */
export default function CreateStorage() {
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
        mutationFn: async (payload: Values) =>
            zStorageRegistryResponse.parse(
                await fetchApiJson(platformApiPath('/storages'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                })
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
            <Button label="Connect storage" clickAction={() => setOpen(true)} />
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
                            title="Connect storage"
                            subtitle="Register an Exoscale SOS backend."
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
                                                    : 'Failed to connect storage',
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
                                                label="Name"
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
                                                label="Endpoint URL"
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
                                                label="Access key ID"
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
                                                label="Secret access key"
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
                                    label="Cancel"
                                    variant="ghost"
                                    isDisabled={mutation.isPending}
                                    clickAction={() => handleOpenChange(false)}
                                />
                                <Button
                                    form={formId}
                                    type="submit"
                                    label={mutation.isPending ? 'Creating...' : 'Create'}
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
