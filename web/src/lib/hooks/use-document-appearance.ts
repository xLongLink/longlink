import { useLayoutEffect } from 'react';
import type { Appearance } from '@/lib/appearance';

/** Applies document appearance while restoring the host's attributes on unmount. */
export function useDocumentAppearance(mode: Appearance['theme'] | undefined) {
    useLayoutEffect(() => {
        if (!mode) return;

        // CSS owns color-scheme and follows the system preference without a media listener.
        const root = document.documentElement;
        const theme = root.getAttribute('data-theme');

        if (mode === 'system') root.removeAttribute('data-theme');
        else root.dataset.theme = mode;

        return () => {
            if (theme === null) root.removeAttribute('data-theme');
            else root.setAttribute('data-theme', theme);
        };
    }, [mode]);
}
