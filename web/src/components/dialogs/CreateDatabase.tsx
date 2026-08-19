import { z } from 'zod';
import { Controller } from 'react-hook-form';
import { Grid } from '@astryxdesign/core/Grid';
import { zodResolver } from '@hookform/resolvers/zod';
import { Selector } from '@astryxdesign/core/Selector';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { TextField } from '@/components/forms/TextField';
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

type Values = z.infer<typeof schema>;

/** Registers one database backend. */
export default function CreateDatabase() {
    const dialog = useRegistryDialog<Values>({
        defaultValues: { name: '', host: '', port: 5432, sslmode: 'require', username: '', password: '' },
        endpoint: '/api/v1/databases',
        errorMessage: 'Failed to connect database',
        queryKey: ['api', '/api/v1/databases'],
        resolver: zodResolver(schema),
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
                <TextField control={dialog.form.control} name="name" label="Name" />
                <Grid columns={{ minWidth: 128, max: 2, repeat: 'fit' }} gap={4}>
                    <TextField control={dialog.form.control} name="host" label="Host" />
                    <Controller
                        control={dialog.form.control}
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
                    control={dialog.form.control}
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
                <TextField control={dialog.form.control} name="username" label="Username" />
                <TextField control={dialog.form.control} name="password" label="Password" type="password" />
            </FormLayout>
        </RegistryDialog>
    );
}
