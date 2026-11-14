import { createContext } from 'react';
import type { Spacing } from './types';

export const GridCollapseContext = createContext(false);

/** Resolves spacing steps against Tailwind's shared spacing unit. */
export function spacing(step: Spacing) {
    return `calc(var(--spacing) * ${step})`;
}
