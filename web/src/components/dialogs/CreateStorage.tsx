import { z } from 'zod';
import { TextInput } from '@astryxdesign/core/TextInput';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { RegistryDialog, useRegistryDialog } from '@/components/dialogs/RegistryDialog';

const schema = z.object({
    name: z.string().trim().min(1),
    endpoint_url: z.string().trim().url(),
    access_key_id: z.string().min(1),
    secret_access_key: z.string().min(1),
});

type Values = z.infer<typeof schema>;

/** Registers one Exoscale SOS backend. */
export default function CreateStorage() {
    const dialog = useRegistryDialog<Values>({
        defaultValues: {
            name: '',
            endpoint_url: '',
            access_key_id: '',
            secret_access_key: '',
        },
        endpoint: '/api/v1/storages',
        errorMessage: 'Failed to connect storage',
        queryKey: ['api', '/api/v1/storages'],
        schema,
    });

    return (
        <RegistryDialog
            dialog={dialog}
            subtitle="Register an Exoscale SOS backend."
            title="Connect storage"
            triggerLabel="Connect storage"
            width={520}
        >
            <FormLayout>
                <dialog.form.Field name="name">
                    {(field) => (
                        <TextInput label="Name" value={field.state.value} isRequired onChange={field.handleChange} />
                    )}
                </dialog.form.Field>
                <dialog.form.Field name="endpoint_url">
                    {(field) => (
                        <TextInput
                            label="Endpoint URL"
                            value={field.state.value}
                            isRequired
                            placeholder="https://sos-ch-dk-2.exo.io"
                            onChange={field.handleChange}
                        />
                    )}
                </dialog.form.Field>
                <dialog.form.Field name="access_key_id">
                    {(field) => (
                        <TextInput
                            label="Access key ID"
                            value={field.state.value}
                            isRequired
                            onChange={field.handleChange}
                        />
                    )}
                </dialog.form.Field>
                <dialog.form.Field name="secret_access_key">
                    {(field) => (
                        <TextInput
                            label="Secret access key"
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
