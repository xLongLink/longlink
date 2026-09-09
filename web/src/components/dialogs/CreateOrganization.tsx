import { z } from 'zod';
import { Controller } from 'react-hook-form';
import { TextInput } from '@astryxdesign/core/TextInput';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { RegistryDialog, useRegistryDialog } from '@/components/dialogs/RegistryDialog';

const schema = z.object({
    name: z.string().trim().min(1),
});

/** Renders the create-organization dialog. */
export default function CreateOrganization() {
    const dialog = useRegistryDialog({
        defaultValues: { name: '' },
        endpoint: '/api/v1/organizations',
        schema,
        additionalInvalidateKeys: [['api', '/api/v1/me/organizations']],
    });

    return (
        <RegistryDialog dialog={dialog} title="New organization" triggerLabel="Create Organization" width={640}>
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
                            placeholder="Example LongLink"
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
