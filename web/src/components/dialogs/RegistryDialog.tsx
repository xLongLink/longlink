import type { z } from 'zod';
import { api } from '@/lib/api';
import { useForm } from '@tanstack/react-form';
import { useToast } from '@/lib/hooks/use-toast';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { createGuardedOpenChange } from '@/lib/utils';
import { useId, useState, type ReactNode } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';

type RegistryDialogOptions<TValues extends Record<string, unknown>> = {
    defaultValues: TValues;
    endpoint: string;
    errorMessage: string;
    schema: z.ZodType<TValues, TValues>;
    additionalInvalidateKeys?: string[][];
};

type RegistryDialogProps<TValues extends Record<string, unknown>> = {
    children: ReactNode;
    dialog: ReturnType<typeof useRegistryDialog<TValues>>;
    subtitle: string;
    title: string;
    triggerLabel: string;
    width: number;
};

/** Manages a registry creation form and its request lifecycle. */
export function useRegistryDialog<TValues extends Record<string, unknown>>({
    defaultValues,
    endpoint,
    errorMessage,
    schema,
    additionalInvalidateKeys = [],
}: RegistryDialogOptions<TValues>) {
    const toast = useToast();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const mutation = useMutation({
        mutationFn: (payload: TValues) => api(endpoint, { json: payload, method: 'POST' }),
        onError: (error) => {
            toast({ body: error instanceof Error ? error.message : errorMessage, type: 'error' });
        },
        onSuccess: () => {
            setOpen(false);
            form.reset();
            return Promise.all([
                queryClient.invalidateQueries({ queryKey: ['api', endpoint] }),
                ...additionalInvalidateKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
            ]);
        },
    });
    const form = useForm({
        defaultValues,
        validators: { onChange: schema },
        onSubmit: ({ value }) => mutation.mutate(value),
    });
    const handleOpenChange = createGuardedOpenChange(mutation.isPending, (nextOpen) => {
        setOpen(nextOpen);

        // Reset the form once the dialog is fully closed.
        if (!nextOpen) {
            form.reset();
        }
    });

    return {
        form,
        isPending: mutation.isPending,
        open,
        openDialog: () => setOpen(true),
        handleOpenChange,
    };
}

/** Renders a registry creation dialog around a resource-specific form. */
export function RegistryDialog<TValues extends Record<string, unknown>>({
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
                            <form
                                id={formId}
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    void dialog.form.handleSubmit();
                                }}
                            >
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
                                <dialog.form.Subscribe selector={(state) => state.isValid}>
                                    {(isValid) => (
                                        <Button
                                            form={formId}
                                            type="submit"
                                            label={dialog.isPending ? 'Creating...' : 'Create'}
                                            variant="primary"
                                            isDisabled={!isValid}
                                            isLoading={dialog.isPending}
                                        />
                                    )}
                                </dialog.form.Subscribe>
                            </Stack>
                        </LayoutFooter>
                    }
                />
            </Dialog>
        </>
    );
}
