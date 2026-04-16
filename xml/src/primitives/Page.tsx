import type { ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/**
 * Root layout primitive. Acts as a transparent wrapper that renders its
 * children directly without adding any DOM element.
 */
export function Page({ children }: { children?: ReactNode }) {
    return children;
}
