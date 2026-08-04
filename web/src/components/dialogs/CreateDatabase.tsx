import { Button } from '@astryxdesign/core/Button';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { Grid } from '@astryxdesign/core/Grid';
import { useTranslator } from '@astryxdesign/core/i18n';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { Selector } from '@astryxdesign/core/Selector';
import { Stack } from '@astryxdesign/core/Stack';
import { TextInput } from '@astryxdesign/core/TextInput';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { PasswordInput } from '@/components/PasswordInput';
import { useToast } from '@/hooks/use-toast';
import { fetchApiJson } from '@/lib/api';
import { apiDatabaseRegistrySchema, DATABASE_SSL_MODES } from '@/lib/api-schemas';
import { platformApiPath } from '@/lib/platform-api';
import { databasesQueryKey } from '@/lib/query-keys';

const schema = z.object({
    name: z.string().trim().min(1),
    host: z.string().trim().min(1),
    port: z.number().int().min(1).max(65535),
    sslmode: z.enum(DATABASE_SSL_MODES),
    username: z.string().trim().min(1),
    password: z.string().min(1),
});

const SSL_MODE_OPTIONS = DATABASE_SSL_MODES.map((value) => ({ value, label: value }));

type Values = z.infer<typeof schema>;

/** Registers one database backend. */
export default function CreateDatabase() {
    const t = useTranslator();
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
        mutationFn: (payload: Values) =>
            fetchApiJson(
                platformApiPath('/databases'),
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                },
                (value) => apiDatabaseRegistrySchema.parse(value)
            ),
        onSuccess: async () => {
            setOpen(false);
            form.reset();
            await queryClient.invalidateQueries({ queryKey: databasesQueryKey });
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
            <Button label={t('dialogs.connectDatabaseTitle')} clickAction={() => setOpen(true)} />
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
                            title={t('dialogs.connectDatabaseTitle')}
                            subtitle={t('dialogs.connectDatabaseDescription')}
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
                                                    : t('dialogs.failedConnectDatabase'),
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
                                    <Grid columns={{ minWidth: 128, max: 2, repeat: 'fit' }} gap={4}>
                                        <Controller
                                            control={form.control}
                                            name="host"
                                            render={({ field }) => (
                                                <TextInput
                                                    ref={field.ref}
                                                    label={t('labels.host')}
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
                                                    label={t('labels.port')}
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
                                                label={t('labels.sslMode')}
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
                                                label={t('labels.username')}
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
                                            <PasswordInput
                                                key={open ? 'open' : 'closed'}
                                                ref={field.ref}
                                                label={t('labels.password')}
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
