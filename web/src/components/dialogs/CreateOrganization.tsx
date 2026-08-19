import { z } from 'zod';
import { useId, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { api } from '@/lib/api';
import { useToast } from '@/lib/hooks/use-toast';

const createOrganizationSchema = z.object({
    name: z.string().trim().min(1),
});

type CreateOrganizationValues = z.infer<typeof createOrganizationSchema>;

const defaultCreateOrganizationValues = {
    name: '',
} satisfies CreateOrganizationValues;

/** Renders the create-organization dialog. */
export default function CreateOrganization() {
    const toast = useToast();
    const queryClient = useQueryClient();
    const createOrganization = useMutation({
        mutationFn: ({ name }: CreateOrganizationValues) =>
            api('/api/v1/organizations', {
                method: 'POST',
                json: { name },
            }),
        onSuccess: () =>
            Promise.all([
                queryClient.invalidateQueries({ queryKey: ['api', '/api/v1/organizations'] }),
                queryClient.invalidateQueries({ queryKey: ['api', '/api/v1/me/organizations'] }),
            ]),
    });
    const formId = useId();
    const [open, setOpen] = useState(false);
    const form = useForm({
        defaultValues: defaultCreateOrganizationValues,
        validators: { onChange: createOrganizationSchema },
        onSubmit: async ({ value }) => {
            // Create the organization and close the dialog on success.
            try {
                await createOrganization.mutateAsync(value);
                setOpen(false);
                form.reset(defaultCreateOrganizationValues);
            } catch (mutationError) {
                toast({
                    body: mutationError instanceof Error ? mutationError.message : 'Failed to create organization',
                    type: 'error',
                });
            }
        },
    });

    /** Updates dialog state while protecting an in-flight creation. */
    function handleOpenChange(nextOpen: boolean) {
        if (!nextOpen && createOrganization.isPending) {
            return;
        }
        setOpen(nextOpen);
        if (!nextOpen) {
            form.reset(defaultCreateOrganizationValues);
        }
    }

    return (
        <>
            <Button label="Create Organization" clickAction={() => setOpen(true)} />

            <Dialog
                isOpen={open}
                onOpenChange={handleOpenChange}
                purpose={createOrganization.isPending ? 'required' : 'form'}
                width={640}
                maxHeight="calc(100dvh - 2rem)"
            >
                <Layout
                    header={
                        <DialogHeader
                            title="New organization"
                            subtitle="Create a new workspace for your account."
                            onOpenChange={handleOpenChange}
                        />
                    }
                    content={
                        <LayoutContent>
                            <form
                                id={formId}
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    void form.handleSubmit();
                                }}
                            >
                                <FormLayout>
                                    <form.Field
                                        name="name"
                                        children={(field) => (
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
                                    />
                                </FormLayout>
                            </form>
                        </LayoutContent>
                    }
                    footer={
                        <LayoutFooter>
                            <Stack direction="horizontal" gap={2} justify="end">
                                <Button
                                    label="Cancel"
                                    variant="ghost"
                                    isDisabled={createOrganization.isPending}
                                    clickAction={() => handleOpenChange(false)}
                                />
                                <Button
                                    form={formId}
                                    type="submit"
                                    label={createOrganization.isPending ? 'Creating...' : 'Create'}
                                    variant="primary"
                                    isDisabled={!form.state.canSubmit}
                                    isLoading={createOrganization.isPending}
                                />
                            </Stack>
                        </LayoutFooter>
                    }
                />
            </Dialog>
        </>
    );
}
