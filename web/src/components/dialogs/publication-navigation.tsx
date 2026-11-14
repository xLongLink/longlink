import { Menu, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Dialog } from '@base-ui/react/dialog';

export function PublicationNavigation({
    open,
    onOpenChange,
    children
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: ReactNode;
}) {
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <header className="publication-mobile-bar">
                <Dialog.Trigger aria-label="Open section navigation" className="publication-nav-toggle" type="button">
                    <Menu aria-hidden="true" size={20} />
                </Dialog.Trigger>
            </header>
            <Dialog.Portal keepMounted>
                <Dialog.Backdrop className="publication-nav-backdrop" />
                <Dialog.Popup className="publication-nav-dialog" aria-label="Section navigation">
                    <header className="publication-nav-header">
                        <Dialog.Title>Section navigation</Dialog.Title>
                        <Dialog.Close
                            aria-label="Close section navigation"
                            className="publication-nav-toggle"
                            type="button"
                        >
                            <X aria-hidden="true" size={20} />
                        </Dialog.Close>
                    </header>
                    <section className="publication-nav-content">{children}</section>
                </Dialog.Popup>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
