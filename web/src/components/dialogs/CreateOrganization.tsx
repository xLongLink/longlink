import { Button } from '@astryxdesign/core/Button';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { Stack } from '@astryxdesign/core/Stack';
import { TextInput } from '@astryxdesign/core/TextInput';
import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useCreateOrganization } from '@/hooks/use-organization';
import { useToast } from '@/hooks/use-toast';

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
    const createOrganization = useCreateOrganization();
    const formId = useId();
    const [open, setOpen] = useState(false);
    const form = useForm<CreateOrganizationValues>({
        defaultValues: defaultCreateOrganizationValues,
        mode: 'onChange',
        resolver: zodResolver(createOrganizationSchema),
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
                                onSubmit={form.handleSubmit(async (payload) => {
                                    // Create the organization and close the dialog on success.
                                    try {
                                        await createOrganization.mutateAsync(payload);
                                        setOpen(false);
                                        form.reset(defaultCreateOrganizationValues);
                                    } catch (mutationError) {
                                        toast({
                                            body:
                                                mutationError instanceof Error
                                                    ? mutationError.message
                                                    : 'Failed to create organization',
                                            type: 'error',
                                        });
                                    }
                                })}
                            >
                                <FormLayout>
                                    <Controller
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <TextInput
                                                ref={field.ref}
                                                label="Name"
                                                value={field.value}
                                                htmlName={field.name}
                                                isRequired
                                                placeholder="Example LongLink"
                                                onBlur={field.onBlur}
                                                onChange={field.onChange}
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
                                    isDisabled={!form.formState.isValid}
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
