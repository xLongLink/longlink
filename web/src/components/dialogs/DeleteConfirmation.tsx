import { Text } from '@astryxdesign/core/Text';
import { Dialog } from '@/components/ui/Dialog';
import { Stack } from '@astryxdesign/core/Stack';
import { useState, type ReactNode } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { createGuardedOpenChange } from '@/lib/utils';

type DeleteConfirmationProps = {
    open: boolean;
    title: string;
    description: ReactNode;
    isPending: boolean;
    onConfirm: () => void;
    onOpenChange: (open: boolean) => void;
};

type UseDeleteDialogOptions<TItem> = {
    title: string;
    mutation: { isPending: boolean; mutate: (id: string, options: { onSuccess: () => void }) => void };
    items: TItem[];
    getId: (item: TItem) => string;
    description: (item: TItem) => ReactNode;
    fallbackDescription: ReactNode;
    onSuccess?: () => void;
};

/** Renders a shared destructive confirmation dialog. */
export function DeleteConfirmation({
    open,
    title,
    description,
    isPending,
    onConfirm,
    onOpenChange,
}: DeleteConfirmationProps) {
    const handleOpenChange = createGuardedOpenChange(isPending, onOpenChange);

    return (
        <Dialog isOpen={open} onOpenChange={handleOpenChange} purpose={isPending ? 'required' : 'form'} title={title}>
            <Text as="div" color="secondary">
                {description}
            </Text>
            <Stack direction="horizontal" gap={2} justify="end">
                <Button
                    label="Cancel"
                    variant="ghost"
                    isDisabled={isPending}
                    clickAction={() => handleOpenChange(false)}
                />
                <Button label="Delete" variant="destructive" isLoading={isPending} clickAction={onConfirm} />
            </Stack>
        </Dialog>
    );
}

/** Manages the shared delete confirmation dialog state and confirm action. */
export function useDeleteDialog<TItem>({
    title,
    mutation,
    items,
    getId,
    description,
    fallbackDescription,
    onSuccess,
}: UseDeleteDialogOptions<TItem>) {
    const [targetId, setTargetId] = useState<string | null>(null);
    const target = targetId === null ? null : items.find((item) => getId(item) === targetId);

    return {
        openFor: (item: TItem) => {
            setTargetId(getId(item));
        },
        dialogProps: {
            open: targetId !== null,
            title,
            description: target ? description(target) : fallbackDescription,
            isPending: mutation.isPending,
            onOpenChange: (open: boolean) => {
                // Closing the dialog clears its selected item.
                if (!open) {
                    setTargetId(null);
                }
            },
            onConfirm: () => {
                // Ignore confirmations without a selected target.
                if (targetId === null) {
                    return;
                }

                // Close the dialog and notify the caller only after deletion succeeds.
                mutation.mutate(targetId, {
                    onSuccess: () => {
                        setTargetId(null);
                        onSuccess?.();
                    },
                });
            },
        } satisfies DeleteConfirmationProps,
    };
}
