import { createContext, useContext } from 'react';
import { defaultAppearance, type Appearance } from '@/lib/appearance';

export const AppearanceContext = createContext<Appearance>(defaultAppearance);

/** Reads the current appearance and supports immediate previews while saving. */
export function useAppearance() {
    return useContext(AppearanceContext);
}
