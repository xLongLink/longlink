import * as React from 'react';

const MOBILE_BREAKPOINT = 768;

/** Subscribes to changes at the mobile viewport breakpoint. */
function subscribe(onStoreChange: () => void): () => void {
    const query = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    query.addEventListener('change', onStoreChange);

    return () => query.removeEventListener('change', onStoreChange);
}

/** Returns whether the browser currently matches the mobile viewport breakpoint. */
function getSnapshot(): boolean {
    return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches;
}

/** Provides a deterministic desktop snapshot during server rendering. */
function getServerSnapshot(): boolean {
    return false;
}

/** Returns whether the current viewport is narrower than the mobile breakpoint. */
export function useIsMobile() {
    return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
