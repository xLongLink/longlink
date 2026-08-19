import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { TextField } from '@/components/forms/TextField';
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
        resolver: zodResolver(schema),
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
                <TextField control={dialog.form.control} name="name" label="Name" />
                <TextField
                    control={dialog.form.control}
                    name="endpoint_url"
                    label="Endpoint URL"
                    placeholder="https://sos-ch-dk-2.exo.io"
                />
                <TextField control={dialog.form.control} name="access_key_id" label="Access key ID" />
                <TextField
                    control={dialog.form.control}
                    name="secret_access_key"
                    label="Secret access key"
                    type="password"
                />
            </FormLayout>
        </RegistryDialog>
    );
}
