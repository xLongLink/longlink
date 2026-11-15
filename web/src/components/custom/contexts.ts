import { createContext } from 'react';
import type { ViewData } from '@/views/protocol';
import type { LucideIconData } from 'lucide-react';

export const ControlSizeContext = createContext<'sm' | 'md' | 'lg' | null>(null);

export const FormRequestContext = createContext<
    | ((
          path: string,
          options: { method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'; form: [string, string | Blob][] }
      ) => Promise<ViewData>)
    | null
>(null);

export const DialogActivityContext = createContext<((open: boolean, fullscreen: boolean) => void) | null>(null);

// Each runtime supplies the icon loader from its own packaged component library.
export const IconRequestContext = createContext<((name: string) => Promise<LucideIconData>) | null>(null);

// The sandbox supplies a host navigation capability; native previews use ordinary links.
export const LinkNavigationContext = createContext<{
    baseUrl: string;
    navigate: (path: string, newTab?: boolean) => void;
} | null>(null);

// Each runtime supplies its own fragment navigation without exposing a router to Views.
export const MenuNavigationContext = createContext<{ hash: string; select: (id: string) => void } | null>(null);
