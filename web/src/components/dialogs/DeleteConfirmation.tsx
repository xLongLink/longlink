import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import type { DeleteConfirmationProps } from '@/lib/utils';

/** Renders a shared destructive confirmation dialog. */
export function DeleteConfirmation({
    open,
    title,
    description,
    isPending,
    onConfirm,
    onOpenChange,
}: DeleteConfirmationProps) {
    return (
        <Dialog
            isOpen={open}
            onOpenChange={(nextOpen) => {
                if (!nextOpen && isPending) {
                    return;
                }
                onOpenChange(nextOpen);
            }}
            purpose={isPending ? 'required' : 'form'}
        >
            <Layout
                header={
                    <DialogHeader
                        title={title}
                        onOpenChange={(nextOpen) => {
                            if (!isPending) {
                                onOpenChange(nextOpen);
                            }
                        }}
                    />
                }
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
                                clickAction={() => onOpenChange(false)}
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
