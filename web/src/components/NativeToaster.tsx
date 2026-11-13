import { X } from 'lucide-react';
import { Toaster } from 'sonner';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

/** Hosts provider-owned API failures using the document's semantic appearance. */
export function NativeToaster({ id, onReady }: { id: string; onReady: () => void }) {
    const [host, setHost] = useState<HTMLElement | null>(null);

    // Keep feedback inside the active modal's focus and announcement boundary without remounting it.
    useEffect(() => {
        const node = document.createElement('div');
        node.className = 'native-notification-host';

        const place = () => {
            const dialogs = document.querySelectorAll('dialog[open], [role="dialog"][data-open]');
            const parent = dialogs[dialogs.length - 1] ?? document.body;

            if (node.parentElement !== parent) parent.append(node);
        };

        place();
        // oxlint-disable-next-line react/set-state-in-effect -- The effect owns the external DOM portal target.
        setHost(node);

        const observer = new MutationObserver(place);
        observer.observe(document.body, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ['open', 'data-open'],
        });

        return () => {
            observer.disconnect();
            node.remove();
        };
    }, []);

    // The portal's Sonner child subscribes before this parent effect publishes queued failures.
    useEffect(() => {
        if (host) onReady();
    }, [host, onReady]);

    if (!host) return null;

    return createPortal(
        <Toaster
            id={id}
            className="native-toaster"
            position="bottom-right"
            duration={5000}
            visibleToasts={5}
            gap={8}
            expand
            closeButton
            icons={{ close: <X aria-hidden="true" /> }}
            offset={{
                right: 'max(var(--spacing-4), env(safe-area-inset-right, 0px))',
                left: 'max(var(--spacing-4), env(safe-area-inset-left, 0px))',
                bottom: 'calc(var(--spacing-4) + env(safe-area-inset-bottom, 0px))',
            }}
            mobileOffset={{
                right: 'max(var(--spacing-4), env(safe-area-inset-right, 0px))',
                left: 'max(var(--spacing-4), env(safe-area-inset-left, 0px))',
                bottom: 'calc(var(--spacing-4) + env(safe-area-inset-bottom, 0px))',
            }}
            toastOptions={{ closeButtonAriaLabel: 'Dismiss notification' }}
            ref={(element) => {
                // Message bodies own initially empty live channels without a second live ancestor.
                element?.setAttribute('aria-live', 'off');
            }}
        />,
        host
    );
}
