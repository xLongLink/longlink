import { createContext, useContext } from 'react';
import { defaultAppearance } from '@/lib/appearance';

export const AppearanceContext = createContext({
    appearance: defaultAppearance,
});

/** Reads the current appearance and supports immediate previews while saving. */
export function useAppearance() {
    return useContext(AppearanceContext);
}
