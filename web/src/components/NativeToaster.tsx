import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { Toaster } from '@/components/shadcn/sonner';

/** Hosts provider-owned API failures using the document's semantic appearance. */
export function NativeToaster({ id, onReady }: { id: string; onReady: () => void }) {
    const [host, setHost] = useState<HTMLElement | null>(null);
    const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
    const [direction, setDirection] = useState<'ltr' | 'rtl'>('ltr');

    // Keep feedback inside the active modal's focus and announcement boundary without remounting it.
    useEffect(() => {
        const node = document.createElement('div');
        node.className = 'native-notification-host';

        const place = () => {
            const mode = document.documentElement.getAttribute('data-theme');
            setTheme(mode === 'light' || mode === 'dark' ? mode : 'system');
            const dir = document.documentElement.getAttribute('dir');
            setDirection(
                dir === 'rtl' || (dir !== 'ltr' && getComputedStyle(document.documentElement).direction === 'rtl')
                    ? 'rtl'
                    : 'ltr'
            );

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
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme', 'dir'],
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
            className="toaster group native-toaster"
            theme={theme}
            dir={direction}
            position="bottom-right"
            duration={5000}
            visibleToasts={5}
            gap={8}
            expand
            closeButton
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
            toastOptions={{ classNames: { toast: 'cn-toast' }, closeButtonAriaLabel: 'Dismiss notification' }}
            ref={(element) => {
                // Message bodies own initially empty live channels without a second live ancestor.
                element?.setAttribute('aria-live', 'off');
            }}
        />,
        host
    );
}
