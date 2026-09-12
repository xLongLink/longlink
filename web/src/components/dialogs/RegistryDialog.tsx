import type { z } from 'zod';
import { api } from '@/lib/api';
import { Dialog } from '@/components/ui/Dialog';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { createGuardedOpenChange } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, type Control, type DefaultValues } from 'react-hook-form';

type RegistryDialogProps<TValues extends Record<string, unknown>> = {
    children: (control: Control<TValues, unknown, TValues>) => ReactNode;
    defaultValues: DefaultValues<NoInfer<TValues>>;
    endpoint: string;
    schema: z.ZodType<TValues, TValues>;
    additionalInvalidateKeys?: string[][];
    title: string;
    triggerLabel?: string;
    width: number;
};

/** Owns a registry creation form, its request lifecycle, and resource-specific fields. */
export function RegistryDialog<TValues extends Record<string, unknown>>({
    children,
    defaultValues,
    endpoint,
    schema,
    additionalInvalidateKeys = [],
    title,
    triggerLabel = title,
    width,
}: RegistryDialogProps<TValues>) {
    // Keep the form and request lifecycle mounted across dialog visibility changes.
    const formId = useId();
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

    // Guard submissions and dismissal while creation is pending.
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

    // Render resource fields with only the form control exposed to callers.
    return (
        <>
            <Button label={triggerLabel} clickAction={() => handleOpenChange(true)} />
            <Dialog
                isOpen={open}
                onOpenChange={handleOpenChange}
                purpose={mutation.isPending ? 'required' : 'form'}
                title={title}
                width={width}
                maxHeight="calc(100dvh - 2rem)"
            >
                <form
                    id={formId}
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (!mutation.isPending && !form.formState.isSubmitting) {
                            void handleSubmit(event);
                        }
                    }}
                >
                    {children(form.control)}
                </form>
                <Stack direction="horizontal" gap={2} justify="end">
                    <Button
                        label="Cancel"
                        variant="ghost"
                        isDisabled={mutation.isPending}
                        clickAction={() => handleOpenChange(false)}
                    />
                    <Button
                        form={formId}
                        type="submit"
                        label={mutation.isPending ? 'Creating...' : 'Create'}
                        variant="primary"
                        isDisabled={!form.formState.isValid || form.formState.isSubmitting || mutation.isPending}
                        isLoading={mutation.isPending}
                    />
                </Stack>
            </Dialog>
        </>
    );
}
