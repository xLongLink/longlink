import type { z } from 'zod';
import { api } from '@/lib/api';
import { Dialog } from '@/components/ui/Dialog';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { createGuardedOpenChange } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useState, type ReactNode } from 'react';
import { useForm, type DefaultValues } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type RegistryDialogOptions<TValues extends Record<string, unknown>> = {
    defaultValues: DefaultValues<NoInfer<TValues>>;
    endpoint: string;
    schema: z.ZodType<TValues, TValues>;
    additionalInvalidateKeys?: string[][];
};

type RegistryDialogProps<TValues extends Record<string, unknown>> = {
    children: ReactNode;
    dialog: ReturnType<typeof useRegistryDialog<TValues>>;
    title: string;
    triggerLabel?: string;
    width: number;
};

/** Manages a registry creation form and its request lifecycle. */
export function useRegistryDialog<TValues extends Record<string, unknown>>({
    defaultValues,
    endpoint,
    schema,
    additionalInvalidateKeys = [],
}: RegistryDialogOptions<TValues>) {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const closeDialog = () => {
        setOpen(false);
        form.reset();
    };
    const mutation = useMutation({
        mutationFn: (payload: TValues) => api(endpoint, { json: payload, method: 'POST' }),
        onSuccess: () => {
            closeDialog();
            return Promise.all([
                queryClient.invalidateQueries({ queryKey: ['api', endpoint] }),
                ...additionalInvalidateKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
            ]);
        },
    });
    const form = useForm<TValues, unknown, TValues>({
        defaultValues,
        resolver: zodResolver(schema),
        mode: 'onChange',
    });
    const handleSubmit = form.handleSubmit((value) => {
        if (!mutation.isPending) {
            mutation.mutate(value);
        }
    });
    const handleOpenChange = createGuardedOpenChange(mutation.isPending, (nextOpen) => {
        if (!nextOpen) {
            closeDialog();
            return;
        }

        setOpen(true);
    });

    return {
        form,
        isPending: mutation.isPending,
        open,
        handleOpenChange,
        handleSubmit,
    };
}

/** Renders a registry creation dialog around a resource-specific form. */
export function RegistryDialog<TValues extends Record<string, unknown>>({
    children,
    dialog,
    title,
    triggerLabel = title,
    width,
}: RegistryDialogProps<TValues>) {
    const formId = useId();

    return (
        <>
            <Button label={triggerLabel} clickAction={() => dialog.handleOpenChange(true)} />
            <Dialog
                isOpen={dialog.open}
                onOpenChange={dialog.handleOpenChange}
                purpose={dialog.isPending ? 'required' : 'form'}
                title={title}
                width={width}
                maxHeight="calc(100dvh - 2rem)"
            >
                <form
                    id={formId}
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (!dialog.isPending && !dialog.form.formState.isSubmitting) {
                            void dialog.handleSubmit(event);
                        }
                    }}
                >
                    {children}
                </form>
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
                        isDisabled={
                            !dialog.form.formState.isValid || dialog.form.formState.isSubmitting || dialog.isPending
                        }
                        isLoading={dialog.isPending}
                    />
                </Stack>
            </Dialog>
        </>
    );
}
