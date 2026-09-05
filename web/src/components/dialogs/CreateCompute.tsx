import { z } from 'zod';
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
                <dialog.form.Field name="name">
                    {(field) => (
                        <TextInput label="Name" value={field.state.value} isRequired onChange={field.handleChange} />
                    )}
                </dialog.form.Field>
                <dialog.form.Field name="kubeconfig">
                    {(field) => (
                        <TextArea
                            label="Kubeconfig"
                            value={field.state.value}
                            isRequired
                            rows={12}
                            onChange={field.handleChange}
                        />
                    )}
                </dialog.form.Field>
            </FormLayout>
        </RegistryDialog>
    );
}
