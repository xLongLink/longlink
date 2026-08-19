import { z } from 'zod';
import { Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TextArea } from '@astryxdesign/core/TextArea';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { TextField } from '@/components/forms/TextField';
import { RegistryDialog, useRegistryDialog } from '@/components/dialogs/RegistryDialog';

const schema = z.object({
    name: z.string().trim().min(1),
    kubeconfig: z.string().refine((value) => value.trim().length > 0),
});

type Values = z.infer<typeof schema>;

/** Registers one compute target. */
export default function CreateCompute() {
    const dialog = useRegistryDialog<Values>({
        defaultValues: { name: '', kubeconfig: '' },
        endpoint: '/api/v1/computes',
        errorMessage: 'Failed to connect compute',
        queryKey: ['api', '/api/v1/computes'],
        resolver: zodResolver(schema),
    });

    return (
        <RegistryDialog
            dialog={dialog}
            subtitle="Register a compute backend for orchestration."
            title="Connect compute"
            triggerLabel="Connect compute"
            width={640}
        >
            <FormLayout>
                <TextField control={dialog.form.control} name="name" label="Name" />
                <Controller
                    control={dialog.form.control}
                    name="kubeconfig"
                    render={({ field }) => (
                        <TextArea
                            ref={field.ref}
                            label="Kubeconfig"
                            value={field.value}
                            htmlName={field.name}
                            isRequired
                            rows={12}
                            onBlur={field.onBlur}
                            onChange={field.onChange}
                        />
                    )}
                />
            </FormLayout>
        </RegistryDialog>
    );
}
