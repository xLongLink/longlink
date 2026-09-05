import { z } from 'zod';
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
                <dialog.form.Field name="name">
                    {(field) => (
                        <TextInput
                            label="Name"
                            value={field.state.value}
                            htmlName="name"
                            isRequired
                            placeholder="Example LongLink"
                            onBlur={field.handleBlur}
                            onChange={field.handleChange}
                            status={
                                field.state.meta.errors.length > 0
                                    ? {
                                          type: 'error',
                                          message: field.state.meta.errors[0]?.message,
                                      }
                                    : undefined
                            }
                        />
                    )}
                </dialog.form.Field>
            </FormLayout>
        </RegistryDialog>
    );
}
