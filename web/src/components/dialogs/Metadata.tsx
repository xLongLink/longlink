import type { ReactNode } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';

type MetadataDialogProps = {
    children: ReactNode;
    onClose: () => void;
    onDelete?: () => void;
    title: string;
};

/** Renders a standard administrator metadata dialog. */
export default function MetadataDialog({ children, onClose, onDelete, title }: MetadataDialogProps) {
    return (
        <Dialog isOpen title={title} onOpenChange={(isOpen) => !isOpen && onClose()} width={560}>
            {children}
            {onDelete ? (
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
            ) : null}
        </Dialog>
    );
}
