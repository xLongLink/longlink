import { z } from 'zod';
import { Controller } from 'react-hook-form';
import { TextArea } from '@astryxdesign/core/TextArea';
import { TextInput } from '@astryxdesign/core/TextInput';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { RegistryDialog, useRegistryDialog } from '@/components/dialogs/RegistryDialog';

const schema = z.object({
    name: z.string().trim().min(1),
    kubeconfig: z.string().trim().min(1),
});

/** Registers one compute target. */
export default function CreateCompute() {
    const dialog = useRegistryDialog({
        defaultValues: { name: '', kubeconfig: '' },
        endpoint: '/api/v1/computes',
        schema,
    });

    return (
        <RegistryDialog dialog={dialog} title="Connect compute" width={640}>
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
                    name="kubeconfig"
                    render={({ field, fieldState }) => (
                        <TextArea
                            ref={field.ref}
                            label="Kubeconfig"
                            value={field.value}
                            htmlName={field.name}
                            isRequired
                            rows={12}
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
