import type { ReactNode } from 'react';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';

type MetadataDialogProps = {
    children: ReactNode;
    onClose: () => void;
    onDelete?: () => void;
    title: string;
};

/** Renders a standard administrator metadata dialog. */
export default function MetadataDialog({ children, onClose, onDelete, title }: MetadataDialogProps) {
    return (
        <Dialog isOpen onOpenChange={(isOpen) => !isOpen && onClose()} width={560}>
            <Layout
                content={<LayoutContent>{children}</LayoutContent>}
                footer={
                    onDelete ? (
                        <LayoutFooter>
                            <Stack direction="horizontal" gap={2} justify="end">
                                <Button
                                    className="text-warning underline"
                                    label="Delete"
                                    variant="ghost"
                                    onClick={() => {
                                        onDelete();
                                        onClose();
                                    }}
                                />
                                <Button label="Close" variant="primary" onClick={onClose} />
                            </Stack>
                        </LayoutFooter>
                    ) : undefined
                }
                header={<DialogHeader title={title} onOpenChange={onClose} />}
            />
        </Dialog>
    );
}
