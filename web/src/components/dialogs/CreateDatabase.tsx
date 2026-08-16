import { z } from 'zod';
import { useId, useState } from 'react';
import { Grid } from '@astryxdesign/core/Grid';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Selector } from '@astryxdesign/core/Selector';
import { TextInput } from '@astryxdesign/core/TextInput';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { api } from '@/lib/api';
import { useToast } from '@/lib/hooks/use-toast';
import { zDatabaseRegistryResponse, zDatabaseSslMode } from '@/lib/generated/platform-api-v1/zod.gen';

const schema = z.object({
    name: z.string().trim().min(1),
    host: z.string().trim().min(1),
    port: z.number().int().min(1).max(65535),
    sslmode: zDatabaseSslMode,
    username: z.string().trim().min(1),
    password: z.string().min(1),
});

const SSL_MODE_OPTIONS = zDatabaseSslMode.options.map((value) => ({ value, label: value }));

type Values = z.infer<typeof schema>;

/** Registers one database backend. */
export default function CreateDatabase() {
    const toast = useToast();
    const queryClient = useQueryClient();
    const formId = useId();
    const [open, setOpen] = useState(false);
    const form = useForm<Values>({
        defaultValues: { name: '', host: '', port: 5432, sslmode: 'require', username: '', password: '' },
        mode: 'onChange',
        resolver: zodResolver(schema),
    });
    const mutation = useMutation({
        mutationFn: async (payload: Values) =>
            zDatabaseRegistryResponse.parse(
                await api('/api/v1/databases', {
                    json: payload,
                    method: 'POST',
                }).json()
            ),
        onSuccess: () => {
            setOpen(false);
            form.reset();
            return queryClient.invalidateQueries({ queryKey: ['api', '/api/v1/databases'] });
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
            <Button label="Connect database" clickAction={() => setOpen(true)} />
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
                            title="Connect database"
                            subtitle="Register a database backend for the LongLink Platform."
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
                                                    : 'Failed to connect database',
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
                                    <Grid columns={{ minWidth: 128, max: 2, repeat: 'fit' }} gap={4}>
                                        <Controller
                                            control={form.control}
                                            name="host"
                                            render={({ field }) => (
                                                <TextInput
                                                    ref={field.ref}
                                                    label="Host"
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
                                            name="port"
                                            render={({ field }) => (
                                                <NumberInput
                                                    ref={field.ref}
                                                    label="Port"
                                                    value={field.value}
                                                    htmlName={field.name}
                                                    isIntegerOnly
                                                    isRequired
                                                    min={1}
                                                    max={65535}
                                                    onBlur={field.onBlur}
                                                    onChange={field.onChange}
                                                />
                                            )}
                                        />
                                    </Grid>
                                    <Controller
                                        control={form.control}
                                        name="sslmode"
                                        render={({ field }) => (
                                            <Selector
                                                label="SSL mode"
                                                options={SSL_MODE_OPTIONS}
                                                value={field.value}
                                                htmlName={field.name}
                                                isRequired
                                                onChange={(value) => {
                                                    if (value !== null) {
                                                        field.onChange(value);
                                                    }
                                                }}
                                            />
                                        )}
                                    />
                                    <Controller
                                        control={form.control}
                                        name="username"
                                        render={({ field }) => (
                                            <TextInput
                                                ref={field.ref}
                                                label="Username"
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
                                        name="password"
                                        render={({ field }) => (
                                            <TextInput
                                                ref={field.ref}
                                                label="Password"
                                                value={field.value}
                                                htmlName={field.name}
                                                isRequired
                                                onBlur={field.onBlur}
                                                onChange={field.onChange}
                                                type="password"
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
