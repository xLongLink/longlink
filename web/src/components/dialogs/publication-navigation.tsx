import { Menu, X } from 'lucide-react';
import { useLocation } from 'react-router';
import { Dialog } from '@base-ui/react/dialog';
import { useState, type ReactNode } from 'react';

/** Owns a mobile navigation session until routing changes or the layout unmounts it. */
export function PublicationNavigation({ children }: { children: ReactNode }) {
    const { key } = useLocation();
    const [openedLocationKey, setOpenedLocationKey] = useState<string | null>(null);

    // Close after routing without remounting retained navigation content.
    if (openedLocationKey !== null && openedLocationKey !== key) {
        setOpenedLocationKey(null);
    }

    return (
        <Dialog.Root open={openedLocationKey === key} onOpenChange={(open) => setOpenedLocationKey(open ? key : null)}>
            <header className="sticky top-0 z-1 flex h-12 items-center bg-background px-2 pt-[env(safe-area-inset-top,0px)]">
                <Dialog.Trigger
                    aria-label="Open section navigation"
                    className="inline-flex size-8 flex-none cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent p-0 text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid focus-visible:outline-offset-2"
                    type="button"
                >
                    <Menu aria-hidden="true" size={20} />
                </Dialog.Trigger>
            </header>
            <Dialog.Portal keepMounted>
                {/* Base UI owns the modal overlay and its focus management. */}
                <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 [&[hidden]]:hidden" />
                <Dialog.Popup
                    className="fixed inset-y-0 start-0 z-50 flex min-h-0 w-[320px] max-w-[85vw] flex-col overflow-hidden border-e border-border bg-sidebar pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] text-foreground outline-none [&[hidden]]:hidden"
                    aria-label="Section navigation"
                >
                    <header className="flex flex-none items-center justify-between gap-2 px-4 py-2">
                        <Dialog.Title className="m-0 text-sm leading-[inherit] font-semibold">
                            Section navigation
                        </Dialog.Title>
                        <Dialog.Close
                            aria-label="Close section navigation"
                            className="inline-flex size-8 flex-none cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent p-0 text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-solid focus-visible:outline-offset-2"
                            type="button"
                        >
                            <X aria-hidden="true" size={20} />
                        </Dialog.Close>
                    </header>
                    <section className="min-h-0 flex-1 overflow-auto [&>nav]:w-full">{children}</section>
                </Dialog.Popup>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
