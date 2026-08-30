import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router';

/** Captures an authentication token from the URL fragment and removes it before the page paints. */
export function useFragmentToken(storageKey: string): string {
    const location = useLocation();
    const fragmentToken = new URLSearchParams(location.hash.replace(/^#/, '')).get('token');
    const token = fragmentToken || sessionStorage.getItem(storageKey) || '';

    useLayoutEffect(() => {
        if (fragmentToken) {
            sessionStorage.setItem(storageKey, fragmentToken);
            window.history.replaceState(window.history.state, '', `${location.pathname}${location.search}`);
        }
    }, [fragmentToken, location.pathname, location.search, storageKey]);

    return token;
}
