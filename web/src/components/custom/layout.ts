import { createContext } from 'react';
import type { Spacing } from './types';

export const GridCollapseContext = createContext(false);

/** Resolves fractional spacing steps to the incumbent theme token names. */
export function spacing(step: Spacing) {
    return `var(--spacing-${String(step).replace('.', '-')})`;
}
