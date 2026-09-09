import { z } from 'zod';
import { Controller } from 'react-hook-form';
import { TextInput } from '@astryxdesign/core/TextInput';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { RegistryDialog, useRegistryDialog } from '@/components/dialogs/RegistryDialog';

const schema = z.object({
    name: z.string().trim().min(1),
    endpoint_url: z.string().trim().url(),
    access_key_id: z.string().min(1),
    secret_access_key: z.string().min(1),
});

/** Registers one Exoscale SOS backend. */
export default function CreateStorage() {
    const dialog = useRegistryDialog({
        defaultValues: {
            name: '',
            endpoint_url: '',
            access_key_id: '',
            secret_access_key: '',
        },
        endpoint: '/api/v1/storages',
        schema,
    });

    return (
        <RegistryDialog dialog={dialog} title="Connect storage" width={520}>
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
                <Controller
                    control={dialog.form.control}
                    name="endpoint_url"
                    render={({ field, fieldState }) => (
                        <TextInput
                            ref={field.ref}
                            label="Endpoint URL"
                            value={field.value}
                            htmlName={field.name}
                            isRequired
                            placeholder="https://sos-ch-dk-2.exo.io"
                            onBlur={field.onBlur}
                            onChange={field.onChange}
                            status={fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined}
                        />
                    )}
                />
                <Controller
                    control={dialog.form.control}
                    name="access_key_id"
                    render={({ field, fieldState }) => (
                        <TextInput
                            ref={field.ref}
                            label="Access key ID"
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
                    name="secret_access_key"
                    render={({ field, fieldState }) => (
                        <TextInput
                            ref={field.ref}
                            label="Secret access key"
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
