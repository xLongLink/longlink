import { createContext } from 'react';

export const SidebarContext = createContext<'expanded' | 'collapsed' | null>(null);
