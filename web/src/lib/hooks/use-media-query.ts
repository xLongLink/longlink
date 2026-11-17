import { useCallback, useSyncExternalStore } from 'react';

/** Observes native media queries without remounting responsive content. */
export function useMediaQuery(query: string) {
    const subscribe = useCallback(
        (notify: () => void) => {
            if (!window.matchMedia) return () => {};
            const media = window.matchMedia(query);
            media.addEventListener('change', notify);

            return () => media.removeEventListener('change', notify);
        },
        [query]
    );

    const getSnapshot = useCallback(() => Boolean(window.matchMedia) && window.matchMedia(query).matches, [query]);

    return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
