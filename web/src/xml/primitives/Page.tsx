import type { ReactNode } from 'react';

/**
 * Root layout primitive. Acts as a transparent wrapper that renders its
 * children directly without adding any DOM element.
 */
export function Page({ children }: { children?: ReactNode }) {
    return children;
}
