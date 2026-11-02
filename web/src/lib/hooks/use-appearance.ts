import { createContext, useContext } from 'react';
import { defaultAppearance, type Appearance } from '@/lib/appearance';

export const AppearanceContext = createContext({
    appearance: defaultAppearance,
    setAppearance: (_appearance: Appearance) => {},
});

/** Reads the current appearance and supports immediate previews while saving. */
export function useAppearance() {
    return useContext(AppearanceContext);
}
