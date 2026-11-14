import { useLayoutEffect } from 'react';
import type { Appearance } from '@/lib/appearance';

/** Applies document appearance while restoring the host's attributes on unmount. */
export function useDocumentAppearance(mode: Appearance['theme'] | undefined, accent?: Appearance['accent']) {
    useLayoutEffect(() => {
        if (!mode && !accent) return;

        // CSS owns color-scheme and follows the system preference without a media listener.
        const root = document.documentElement;
        const theme = root.getAttribute('data-theme');
        const previousAccent = root.getAttribute('data-accent');

        if (mode === 'system') root.removeAttribute('data-theme');
        else if (mode) root.dataset.theme = mode;

        if (accent) root.dataset.accent = accent;

        return () => {
            if (mode) {
                if (theme === null) root.removeAttribute('data-theme');
                else root.setAttribute('data-theme', theme);
            }

            if (accent) {
                if (previousAccent === null) root.removeAttribute('data-accent');
                else root.setAttribute('data-accent', previousAccent);
            }
        };
    }, [mode, accent]);
}
