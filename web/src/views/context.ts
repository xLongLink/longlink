import { createContext } from 'react';
import type { ViewData } from './protocol';

export const RequestContext = createContext<
    | ((
          path: string,
          options?: { method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'; form: [string, string | Blob][] }
      ) => Promise<ViewData>)
    | null
>(null);
