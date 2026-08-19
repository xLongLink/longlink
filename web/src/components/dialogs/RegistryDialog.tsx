import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { useId, useState, type ReactNode } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { useForm, type DefaultValues, type FieldValues, type Resolver } from 'react-hook-form';
import { api } from '@/lib/api';
import { useToast } from '@/lib/hooks/use-toast';

type RegistryDialogOptions<TValues extends FieldValues> = {
    defaultValues: DefaultValues<TValues>;
    endpoint: string;
    errorMessage: string;
    queryKey: readonly unknown[];
    resolver: Resolver<TValues>;
};

type RegistryDialogProps<TValues extends FieldValues> = {
    children: ReactNode;
    dialog: ReturnType<typeof useRegistryDialog<TValues>>;
    subtitle: string;
    title: string;
    triggerLabel: string;
    width: number;
};

/** Manages a registry creation form and its request lifecycle. */
export function useRegistryDialog<TValues extends FieldValues>({
    defaultValues,
    endpoint,
    errorMessage,
    queryKey,
    resolver,
}: RegistryDialogOptions<TValues>) {
    const toast = useToast();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const form = useForm<TValues>({ defaultValues, mode: 'onChange', resolver });
    const mutation = useMutation({
        mutationFn: (payload: TValues) => api(endpoint, { json: payload, method: 'POST' }),
        onError: (error) => {
            toast({ body: error instanceof Error ? error.message : errorMessage, type: 'error' });
        },
        onSuccess: () => {
            setOpen(false);
            form.reset();
            void queryClient.invalidateQueries({ queryKey });
        },
    });

    /** Updates dialog state while protecting an in-flight registration. */
    function handleOpenChange(nextOpen: boolean) {
        if (!nextOpen && mutation.isPending) {
            return;
        }

        setOpen(nextOpen);
        if (!nextOpen) {
            form.reset();
        }
    }

    return {
        form,
        isPending: mutation.isPending,
        open,
        openDialog: () => setOpen(true),
        handleOpenChange,
        submit: form.handleSubmit((payload) => mutation.mutate(payload)),
    };
}

/** Renders a registry creation dialog around a resource-specific form. */
export function RegistryDialog<TValues extends FieldValues>({
    children,
    dialog,
    subtitle,
    title,
    triggerLabel,
    width,
}: RegistryDialogProps<TValues>) {
    const formId = useId();

    return (
        <>
            <Button label={triggerLabel} clickAction={dialog.openDialog} />
            <Dialog
                isOpen={dialog.open}
                onOpenChange={dialog.handleOpenChange}
                purpose={dialog.isPending ? 'required' : 'form'}
                width={width}
                maxHeight="calc(100dvh - 2rem)"
            >
                <Layout
                    header={<DialogHeader title={title} subtitle={subtitle} onOpenChange={dialog.handleOpenChange} />}
                    content={
                        <LayoutContent>
                            <form id={formId} onSubmit={dialog.submit}>
                                {children}
                            </form>
                        </LayoutContent>
                    }
                    footer={
                        <LayoutFooter>
                            <Stack direction="horizontal" gap={2} justify="end">
                                <Button
                                    label="Cancel"
                                    variant="ghost"
                                    isDisabled={dialog.isPending}
                                    clickAction={() => dialog.handleOpenChange(false)}
                                />
                                <Button
                                    form={formId}
                                    type="submit"
                                    label={dialog.isPending ? 'Creating...' : 'Create'}
                                    variant="primary"
                                    isDisabled={!dialog.form.formState.isValid}
                                    isLoading={dialog.isPending}
                                />
                            </Stack>
                        </LayoutFooter>
                    }
                />
            </Dialog>
        </>
    );
}
