import type { ReactNode } from 'react';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { createGuardedOpenChange } from '@/lib/utils';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';

export type DeleteConfirmationProps = {
    open: boolean;
    title: string;
    description: ReactNode;
    isPending: boolean;
    onConfirm: () => void;
    onOpenChange: (open: boolean) => void;
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
