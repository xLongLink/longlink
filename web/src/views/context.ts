import { createContext } from 'react';
import type { ViewData } from './protocol';

export const ViewRequestContext = createContext<((path: string) => Promise<ViewData>) | null>(null);
