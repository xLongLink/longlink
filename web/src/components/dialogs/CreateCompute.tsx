import { z } from 'zod';
import { useId, useState } from 'react';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { useToast } from '@astryxdesign/core/Toast';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TextArea } from '@astryxdesign/core/TextArea';
import { useTranslator } from '@astryxdesign/core/i18n';
import { TextInput } from '@astryxdesign/core/TextInput';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { fetchApiJson } from '@/lib/api';
import { useUserProfile } from '@/hooks/use-user';
import { computesQueryKey, infrastructureOptionsQueryKey } from '@/lib/query-keys';
import { apiComputeMutationResponseSchema, parseApiResponse } from '@/lib/api-schemas';

const schema = z.object({
    name: z.string().trim().min(1),
    kubeconfig: z.string().refine((value) => value.trim().length > 0),
});

type Values = z.infer<typeof schema>;

/** Registers one compute target. */
export default function CreateCompute() {
    const t = useTranslator();
    const toast = useToast();
    const { role } = useUserProfile();
    const queryClient = useQueryClient();
    const formId = useId();
    const [open, setOpen] = useState(false);
    const form = useForm<Values>({
        defaultValues: { name: '', kubeconfig: '' },
        mode: 'onChange',
        resolver: zodResolver(schema),
    });
    const mutation = useMutation({
        mutationFn: async (payload: Values) =>
            fetchApiJson(
                '/api/computes',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                },
                (value) => parseApiResponse(apiComputeMutationResponseSchema, value)
            ),
        onSuccess: async () => {
            setOpen(false);
            resetDialogState();
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: computesQueryKey() }),
                queryClient.invalidateQueries({ queryKey: infrastructureOptionsQueryKey() }),
            ]);
        },
    });

    // Only administrators can register infrastructure.
    if (role !== 'administrator') {
        return null;
    }

    /** Clears connection secrets when the dialog closes. */
    function resetDialogState() {
        form.reset();
    }

    /** Updates dialog state while protecting an in-flight registration. */
    function handleOpenChange(nextOpen: boolean) {
        if (!nextOpen && mutation.isPending) {
            return;
        }
        setOpen(nextOpen);
        if (!nextOpen) {
            resetDialogState();
        }
    }

    return (
        <>
            <Button label={t('dialogs.connectComputeTitle')} clickAction={() => setOpen(true)} />
            <Dialog
                isOpen={open}
                onOpenChange={handleOpenChange}
                purpose={mutation.isPending ? 'required' : 'form'}
                width={640}
                maxHeight="calc(100dvh - 2rem)"
            >
                <Layout
                    header={
                        <DialogHeader
                            title={t('dialogs.connectComputeTitle')}
                            subtitle={t('dialogs.connectComputeDescription')}
                            onOpenChange={handleOpenChange}
                        />
                    }
                    content={
                        <LayoutContent>
                            <form
                                id={formId}
                                onSubmit={form.handleSubmit(async (payload) => {
                                    try {
                                        await mutation.mutateAsync(payload);
                                    } catch (mutationError) {
                                        toast({
                                            body:
                                                mutationError instanceof Error
                                                    ? mutationError.message
                                                    : t('dialogs.failedConnectCompute'),
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
                                                label={t('labels.name')}
                                                value={field.value}
                                                htmlName={field.name}
                                                isRequired
                                                onBlur={field.onBlur}
                                                onChange={field.onChange}
                                            />
                                        )}
                                    />
                                    <Controller
                                        control={form.control}
                                        name="kubeconfig"
                                        render={({ field }) => (
                                            <TextArea
                                                ref={field.ref}
                                                label={t('labels.kubeconfig')}
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
                            </form>
                        </LayoutContent>
                    }
                    footer={
                        <LayoutFooter>
                            <Stack direction="horizontal" gap={2} justify="end">
                                <Button
                                    label={t('actions.cancel')}
                                    variant="ghost"
                                    isDisabled={mutation.isPending}
                                    clickAction={() => handleOpenChange(false)}
                                />
                                <Button
                                    form={formId}
                                    type="submit"
                                    label={mutation.isPending ? t('actions.creating') : t('actions.create')}
                                    variant="primary"
                                    isDisabled={!form.formState.isValid}
                                    isLoading={mutation.isPending}
                                />
                            </Stack>
                        </LayoutFooter>
                    }
                />
            </Dialog>
        </>
    );
}
