import type { ReactNode } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';

type MetadataDialogProps = {
    children: ReactNode;
    footer?: ReactNode;
    onClose: () => void;
    title: string;
};

/** Renders a standard administrator metadata dialog. */
export default function MetadataDialog({ children, footer, onClose, title }: MetadataDialogProps) {
    return (
        <Dialog isOpen onOpenChange={(isOpen) => !isOpen && onClose()} width={560}>
            <Layout
                content={<LayoutContent>{children}</LayoutContent>}
                footer={footer === undefined ? undefined : <LayoutFooter>{footer}</LayoutFooter>}
                header={<DialogHeader title={title} onOpenChange={onClose} />}
            />
        </Dialog>
    );
}
