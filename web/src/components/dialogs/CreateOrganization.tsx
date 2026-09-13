import { z } from 'zod';
import { Controller } from 'react-hook-form';
import { TextInput } from '@astryxdesign/core/TextInput';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { RegistryDialog } from '@/components/dialogs/RegistryDialog';

const schema = z.object({
    name: z.string().trim().min(1),
});

/** Renders the create-organization dialog. */
export default function CreateOrganization() {
    // Configure creation and render the organization fields.
    return (
        <RegistryDialog
            defaultValues={{ name: '' }}
            endpoint="/api/v1/organizations"
            schema={schema}
            additionalInvalidateKeys={[['api', '/api/v1/me/organizations']]}
            title="New organization"
            triggerLabel="Create Organization"
            width={640}
        >
            {(control) => (
                <FormLayout>
                    <Controller
                        control={control}
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
                                status={
                                    fieldState.error ? { type: 'error', message: fieldState.error.message } : undefined
                                }
                            />
                        )}
                    />
                </FormLayout>
            )}
        </RegistryDialog>
    );
}
