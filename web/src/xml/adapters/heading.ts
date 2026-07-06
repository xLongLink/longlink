import type { ReactNode } from 'react';

/** Builds a stable heading id from translated XML heading text. */
export function headingId(value: ReactNode): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const id = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    return id || undefined;
}
