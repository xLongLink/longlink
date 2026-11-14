import { useLayoutEffect } from 'react';
import type { Appearance } from '@/lib/appearance';

/** Applies the active document mode while preserving the host's styles on unmount. */
export function useDocumentTheme(mode: Appearance['theme'] | undefined) {
    useLayoutEffect(() => {
        if (!mode) return;

        // System mode follows the browser preference through color-scheme, without a media listener.
        const root = document.documentElement;
        const theme = root.getAttribute('data-theme');
        const colorScheme = root.style.getPropertyValue('color-scheme');
        const priority = root.style.getPropertyPriority('color-scheme');

        if (mode === 'system') root.removeAttribute('data-theme');
        else root.dataset.theme = mode;
        root.style.setProperty('color-scheme', mode === 'system' ? 'light dark' : mode);

        return () => {
            if (theme === null) root.removeAttribute('data-theme');
            else root.setAttribute('data-theme', theme);

            if (colorScheme) root.style.setProperty('color-scheme', colorScheme, priority);
            else root.style.removeProperty('color-scheme');
        };
    }, [mode]);
}
