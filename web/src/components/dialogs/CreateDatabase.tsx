import { z } from 'zod';
import { useId, useState } from 'react';
import { Grid } from '@astryxdesign/core/Grid';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Selector } from '@astryxdesign/core/Selector';
import { useTranslator } from '@astryxdesign/core/i18n';
import { TextInput } from '@astryxdesign/core/TextInput';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { FieldStatus } from '@astryxdesign/core/FieldStatus';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { fetchApiJson } from '@/lib/api';
import { useUserProfile } from '@/hooks/use-user';
import { apiDatabaseRegistrySchema, parseApiResponse } from '@/lib/api-schemas';
import { databasesQueryKey, infrastructureOptionsQueryKey } from '@/lib/query-keys';

const schema = z.object({
    name: z.string().trim().min(1),
    host: z.string().trim().min(1),
    port: z.number().int().min(1).max(65535),
    sslmode: z.enum(['disable', 'allow', 'prefer', 'require', 'verify-ca', 'verify-full']),
    username: z.string().trim().min(1),
    password: z.string().min(1),
});

const SSL_MODE_OPTIONS = [
    { value: 'disable', label: 'disable' },
    { value: 'allow', label: 'allow' },
    { value: 'prefer', label: 'prefer' },
    { value: 'require', label: 'require' },
    { value: 'verify-ca', label: 'verify-ca' },
    { value: 'verify-full', label: 'verify-full' },
];

type Values = z.infer<typeof schema>;

/** Registers one database backend. */
export default function CreateDatabase() {
    const t = useTranslator();
    const { role } = useUserProfile();
    const queryClient = useQueryClient();
    const formId = useId();
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const form = useForm<Values>({
        defaultValues: { name: '', host: '', port: 5432, sslmode: 'require', username: '', password: '' },
        mode: 'onChange',
        resolver: zodResolver(schema),
    });
    const mutation = useMutation({
        mutationFn: async (payload: Values) =>
            fetchApiJson(
                '/api/databases',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                },
                (value) => parseApiResponse(apiDatabaseRegistrySchema, value)
            ),
        onSuccess: async () => {
            setOpen(false);
            resetDialogState();
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: databasesQueryKey() }),
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
                                    setError(null);
                                    try {
                                        await mutation.mutateAsync(payload);
                                    } catch (mutationError) {
                                        setError(
                                            mutationError instanceof Error
                                                ? mutationError.message
                                                : t('dialogs.failedConnectDatabase')
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
                                            <Stack gap={1}>
                                                <TextInput
                                                    ref={field.ref}
                                                    label={t('labels.password')}
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
                                                    clickAction={() => setPasswordVisible((current) => !current)}
                                                />
                                            </Stack>
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
