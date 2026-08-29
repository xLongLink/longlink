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
    // Wrap optional footer content in the shared dialog layout region.
    const layoutFooter = footer === undefined ? undefined : <LayoutFooter>{footer}</LayoutFooter>;

    return (
        <Dialog
            isOpen
            onOpenChange={(isOpen) => {
                if (!isOpen) onClose();
            }}
            purpose="info"
            width={560}
        >
            <Layout
                content={<LayoutContent>{children}</LayoutContent>}
                footer={layoutFooter}
                header={<DialogHeader title={title} onOpenChange={onClose} />}
            />
        </Dialog>
    );
}
