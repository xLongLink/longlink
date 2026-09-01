import { z } from 'zod';
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
        <RegistryDialog
            dialog={dialog}
            subtitle="Register a database backend for the LongLink Platform."
            title="Connect database"
            triggerLabel="Connect database"
            width={520}
        >
            <FormLayout>
                <dialog.form.Field name="name">
                    {(field) => (
                        <TextInput label="Name" value={field.state.value} isRequired onChange={field.handleChange} />
                    )}
                </dialog.form.Field>
                <Grid columns={{ minWidth: 128, max: 2, repeat: 'fit' }} gap={4}>
                    <dialog.form.Field name="host">
                        {(field) => (
                            <TextInput
                                label="Host"
                                value={field.state.value}
                                isRequired
                                onChange={field.handleChange}
                            />
                        )}
                    </dialog.form.Field>
                    <dialog.form.Field name="port">
                        {(field) => (
                            <NumberInput
                                label="Port"
                                value={field.state.value}
                                isIntegerOnly
                                isRequired
                                min={1}
                                max={65535}
                                onChange={field.handleChange}
                            />
                        )}
                    </dialog.form.Field>
                </Grid>
                <dialog.form.Field name="sslmode">
                    {(field) => (
                        <Selector
                            label="SSL mode"
                            options={SSL_MODE_OPTIONS}
                            value={field.state.value}
                            isRequired
                            onChange={(value) => {
                                const sslmode = zDatabaseSslMode.safeParse(value);
                                if (sslmode.success) {
                                    field.handleChange(sslmode.data);
                                }
                            }}
                        />
                    )}
                </dialog.form.Field>
                <dialog.form.Field name="username">
                    {(field) => (
                        <TextInput
                            label="Username"
                            value={field.state.value}
                            isRequired
                            onChange={field.handleChange}
                        />
                    )}
                </dialog.form.Field>
                <dialog.form.Field name="password">
                    {(field) => (
                        <TextInput
                            label="Password"
                            value={field.state.value}
                            isRequired
                            type="password"
                            onChange={field.handleChange}
                        />
                    )}
                </dialog.form.Field>
            </FormLayout>
        </RegistryDialog>
    );
}
