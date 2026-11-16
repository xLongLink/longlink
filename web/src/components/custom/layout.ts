import { createContext } from 'react';

export const GridCollapseContext = createContext(false);

/** Resolves spacing steps against Tailwind's shared spacing unit. */
export function spacing(step: number) {
    return `calc(var(--spacing) * ${step})`;
}
