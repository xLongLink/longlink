import { z } from 'zod';
import { Controller } from 'react-hook-form';
import { Grid } from '@astryxdesign/core/Grid';
import { Selector } from '@astryxdesign/core/Selector';
import { TextInput } from '@astryxdesign/core/TextInput';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { zDatabaseSslMode } from '@/lib/generated/platform-api-v1/zod.gen';
import { RegistryDialog, useRegistryDialog } from '@/components/dialogs/RegistryDialog';

const schema = z.object({
    name: z.string().trim().min(1),
    host: z.string().trim().min(1),
    port: z.number().int().min(1).max(65535),
    sslmode: zDatabaseSslMode,
    username: z.string().trim().min(1),
    password: z.string().min(1),
});

const SSL_MODE_OPTIONS = zDatabaseSslMode.options.map((value) => ({ value, label: value }));

/** Registers one database backend. */
export default function CreateDatabase() {
    const dialog = useRegistryDialog({
        defaultValues: { name: '', host: '', port: 5432, sslmode: 'require', username: '', password: '' },
        endpoint: '/api/v1/databases',
        schema,
    });

    return (
        <RegistryDialog dialog={dialog} title="Connect database" width={520}>
            <FormLayout>
                <Controller
                    control={dialog.form.control}
                    name="name"
                    render={({ field, fieldState }) => (
                        <TextInput
                            ref={field.ref}
                            label="Name"
                            value={field.value}
                            htmlName={field.name}
                            isRequired
                            onBlur={field.onBlur}
                            onChange={field.onChange}
                            status={fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined}
                        />
                    )}
                />
                <Grid columns={{ minWidth: 128, max: 2, repeat: 'fit' }} gap={4}>
                    <Controller
                        control={dialog.form.control}
                        name="host"
                        render={({ field, fieldState }) => (
                            <TextInput
                                ref={field.ref}
                                label="Host"
                                value={field.value}
                                htmlName={field.name}
                                isRequired
                                onBlur={field.onBlur}
                                onChange={field.onChange}
                                status={
                                    fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined
                                }
                            />
                        )}
                    />
                    <Controller
                        control={dialog.form.control}
                        name="port"
                        render={({ field, fieldState }) => (
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
                                status={
                                    fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined
                                }
                            />
                        )}
                    />
                </Grid>
                <Controller
                    control={dialog.form.control}
                    name="sslmode"
                    render={({ field, fieldState }) => (
                        <Selector
                            label="SSL mode"
                            options={SSL_MODE_OPTIONS}
                            value={field.value}
                            htmlName={field.name}
                            isRequired
                            onBlur={field.onBlur}
                            status={fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined}
                            onChange={(value) => {
                                const sslmode = zDatabaseSslMode.safeParse(value);
                                if (sslmode.success) {
                                    field.onChange(sslmode.data);
                                }
                            }}
                        />
                    )}
                />
                <Controller
                    control={dialog.form.control}
                    name="username"
                    render={({ field, fieldState }) => (
                        <TextInput
                            ref={field.ref}
                            label="Username"
                            value={field.value}
                            htmlName={field.name}
                            isRequired
                            onBlur={field.onBlur}
                            onChange={field.onChange}
                            status={fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined}
                        />
                    )}
                />
                <Controller
                    control={dialog.form.control}
                    name="password"
                    render={({ field, fieldState }) => (
                        <TextInput
                            ref={field.ref}
                            label="Password"
                            value={field.value}
                            htmlName={field.name}
                            isRequired
                            type="password"
                            onBlur={field.onBlur}
                            onChange={field.onChange}
                            status={fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined}
                        />
                    )}
                />
            </FormLayout>
        </RegistryDialog>
    );
}
