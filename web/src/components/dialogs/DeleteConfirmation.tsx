import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { useState, type ReactNode } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { createGuardedOpenChange } from '@/lib/utils';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';

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
    mutation: { isPending: boolean; mutateAsync: (id: string) => Promise<unknown> };
    items: TItem[];
    getId: (item: TItem) => string;
    description: (item: TItem) => ReactNode;
    errorMessage: string;
    fallbackDescription: ReactNode;
    onError: (message: string) => void;
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
        <Dialog isOpen={open} onOpenChange={handleOpenChange} purpose={isPending ? 'required' : 'form'}>
            <Layout
                header={<DialogHeader title={title} onOpenChange={handleOpenChange} />}
                content={
                    <LayoutContent>
                        <Text as="div" color="secondary">
                            {description}
                        </Text>
                    </LayoutContent>
                }
                footer={
                    <LayoutFooter>
                        <Stack direction="horizontal" gap={2} justify="end">
                            <Button
                                label="Cancel"
                                variant="ghost"
                                isDisabled={isPending}
                                clickAction={() => handleOpenChange(false)}
                            />
                            <Button
                                label="Delete"
                                variant="destructive"
                                isLoading={isPending}
                                clickAction={onConfirm}
                            />
                        </Stack>
                    </LayoutFooter>
                }
            />
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
    errorMessage,
    fallbackDescription,
    onError,
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
            onConfirm: async () => {
                // Ignore confirmations without a selected target.
                if (targetId === null) {
                    return;
                }

                // Run the delete mutation and surface any failure.
                try {
                    await mutation.mutateAsync(targetId);
                    setTargetId(null);
                } catch (mutationError) {
                    onError(mutationError instanceof Error ? mutationError.message : errorMessage);
                }
            },
        } satisfies DeleteConfirmationProps,
    };
}
