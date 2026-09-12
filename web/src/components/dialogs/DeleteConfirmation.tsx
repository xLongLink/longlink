import { Text } from '@astryxdesign/core/Text';
import { Dialog } from '@/components/ui/Dialog';
import { Stack } from '@astryxdesign/core/Stack';
import { useState, type ReactNode } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { createGuardedOpenChange } from '@/lib/utils';

type UseDeleteDialogOptions<TItem> = {
    title: string;
    mutation: { isPending: boolean; mutate: (id: string, options: { onSuccess: () => void }) => void };
    items: TItem[];
    getId: (item: TItem) => string;
    description: (item: TItem) => ReactNode;
    fallbackDescription: ReactNode;
    onSuccess?: () => void;
};

/** Returns the delete dialog and an action that selects its target by ID. */
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
    const handleOpenChange = createGuardedOpenChange(mutation.isPending, (open) => {
        // Closing the dialog clears its selected item.
        if (!open) {
            setTargetId(null);
        }
    });

    return {
        openFor: (item: TItem) => {
            setTargetId(getId(item));
        },
        dialog: (
            <Dialog
                isOpen={targetId !== null}
                onOpenChange={handleOpenChange}
                purpose={mutation.isPending ? 'required' : 'form'}
                title={title}
            >
                <Text as="div" color="secondary">
                    {target ? description(target) : fallbackDescription}
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
                            if (targetId === null || mutation.isPending) {
                                return;
                            }

                            // Close the dialog and notify the caller only after deletion succeeds.
                            mutation.mutate(targetId, {
                                onSuccess: () => {
                                    setTargetId(null);
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
