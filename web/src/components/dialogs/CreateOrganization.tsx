import { z } from 'zod';
import { useId, useState } from 'react';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useTranslator } from '@astryxdesign/core/i18n';
import { TextInput } from '@astryxdesign/core/TextInput';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/use-user';
import { useCreateOrganization } from '@/hooks/use-organization';

const createOrganizationSchema = z.object({
    name: z.string().trim().min(1),
});

type CreateOrganizationInput = z.input<typeof createOrganizationSchema>;
type CreateOrganizationValues = z.output<typeof createOrganizationSchema>;

const defaultCreateOrganizationValues = {
    name: '',
} satisfies CreateOrganizationInput;

/** Renders the create-organization dialog. */
export default function CreateOrganization() {
    const t = useTranslator();
    const toast = useToast();
    const { role } = useUserProfile();
    const createOrganization = useCreateOrganization();
    const formId = useId();
    const [open, setOpen] = useState(false);
    const form = useForm<CreateOrganizationInput, unknown, CreateOrganizationValues>({
        defaultValues: defaultCreateOrganizationValues,
        mode: 'onChange',
        resolver: zodResolver(createOrganizationSchema),
    });

    // Hide organization creation from support users.
    if (role === 'support') {
        return null;
    }

    /** Clears the organization creation form state. */
    function resetDialogState() {
        form.reset(defaultCreateOrganizationValues);
    }

    /** Updates dialog state while protecting an in-flight creation. */
    function handleOpenChange(nextOpen: boolean) {
        if (!nextOpen && createOrganization.isPending) {
            return;
        }
        setOpen(nextOpen);
        if (!nextOpen) {
            resetDialogState();
        }
    }

    return (
        <>
            <Button label={t('actions.createOrganization')} clickAction={() => setOpen(true)} />

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
                            title={t('createOrganization.title')}
                            subtitle={t('createOrganization.description')}
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
                                        await createOrganization.mutateAsync({
                                            name: payload.name,
                                        });
                                        setOpen(false);
                                        resetDialogState();
                                    } catch (mutationError) {
                                        toast({
                                            body:
                                                mutationError instanceof Error
                                                    ? mutationError.message
                                                    : t('createOrganization.error'),
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
                                                label={t('createOrganization.nameLabel')}
                                                value={field.value}
                                                htmlName={field.name}
                                                isRequired
                                                placeholder={t('createOrganization.namePlaceholder')}
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
                                    label={t('actions.cancel')}
                                    variant="ghost"
                                    isDisabled={createOrganization.isPending}
                                    clickAction={() => handleOpenChange(false)}
                                />
                                <Button
                                    form={formId}
                                    type="submit"
                                    label={createOrganization.isPending ? t('actions.creating') : t('actions.create')}
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
