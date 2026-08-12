import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router';

/** Captures an authentication token from the URL fragment and removes it before the page paints. */
export function useFragmentToken(storageKey: string): string {
    const location = useLocation();
    const fragmentToken = new URLSearchParams(location.hash.replace(/^#/, '')).get('token')?.trim() ?? '';
    const token = fragmentToken || sessionStorage.getItem(storageKey) || '';

    useLayoutEffect(() => {
        // URL fragments do not reach the server; remove the credential before the page paints.
        if (fragmentToken) {
            sessionStorage.setItem(storageKey, fragmentToken);
            window.history.replaceState(window.history.state, '', `${location.pathname}${location.search}`);
        }
    }, [fragmentToken, location.pathname, location.search, storageKey]);

    return token;
}
