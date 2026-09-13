import { Text } from '@astryxdesign/core/Text';
import { Dialog } from '@/components/ui/Dialog';
import { Stack } from '@astryxdesign/core/Stack';
import { useState, type ReactNode } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { createGuardedOpenChange } from '@/lib/utils';

type UseDeleteDialogOptions<TItem> = {
    title: string;
    mutation: { isPending: boolean; mutate: (id: string, options: { onSuccess: () => void }) => void };
    getId: (item: TItem) => string;
    description: (item: TItem) => ReactNode;
    onSuccess?: () => void;
};

/** Returns the delete dialog and an action that selects its target. */
export function useDeleteDialog<TItem>({
    title,
    mutation,
    getId,
    description,
    onSuccess,
}: UseDeleteDialogOptions<TItem>) {
    const [target, setTarget] = useState<TItem | null>(null);
    const handleOpenChange = createGuardedOpenChange(mutation.isPending, (open) => {
        // Closing the dialog clears its selected item.
        if (!open) {
            setTarget(null);
        }
    });

    return {
        openFor: (item: TItem) => {
            setTarget(item);
        },
        dialog: (
            <Dialog
                isOpen={target !== null}
                onOpenChange={handleOpenChange}
                purpose={mutation.isPending ? 'required' : 'form'}
                title={title}
            >
                <Text as="div" color="secondary">
                    {target === null ? null : description(target)}
                </Text>
                <Stack direction="horizontal" gap={2} justify="end">
                    <Button
                        label="Cancel"
                        variant="ghost"
                        isDisabled={mutation.isPending}
                        clickAction={() => handleOpenChange(false)}
                    />
                    <Button
                        label="Delete"
                        variant="destructive"
                        isLoading={mutation.isPending}
                        clickAction={() => {
                            // Ignore confirmations without a selected target or while deletion is pending.
                            if (target === null || mutation.isPending) {
                                return;
                            }

                            // Close the dialog and notify the caller only after deletion succeeds.
                            mutation.mutate(getId(target), {
                                onSuccess: () => {
                                    setTarget(null);
                                    onSuccess?.();
                                },
                            });
                        }}
                    />
                </Stack>
            </Dialog>
        ),
    };
}
