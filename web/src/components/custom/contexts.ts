import { createContext } from 'react';
import type { ViewData } from '@/views/protocol';
import type { LucideIconData } from 'lucide-react';

export const ControlSizeContext = createContext<'sm' | 'md' | 'lg' | null>(null);

export const ButtonGroupContext = createContext<{ orientation: 'horizontal' | 'vertical'; isDisabled: boolean } | null>(
    null
);

// Form exposes validation without owning the navigation of its descendants.
export const FormValidationContext = createContext<((panel?: HTMLElement) => boolean) | null>(null);

export const FormRequestContext = createContext<
    | ((
          path: string,
          options: { method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'; form: [string, string | Blob][] }
      ) => Promise<ViewData>)
    | null
>(null);

export const DialogActivityContext = createContext<((open: boolean, fullscreen: boolean) => void) | null>(null);

// Native pages and isolated Views supply separate loaders for the same public icon contract.
export const IconRequestContext = createContext<((name: string) => Promise<LucideIconData>) | null>(null);

// The sandbox supplies a host navigation capability; native previews use ordinary links.
export const LinkNavigationContext = createContext<{
    baseUrl: string;
    navigate: (path: string, newTab?: boolean) => void;
} | null>(null);

// Each runtime supplies its own fragment navigation without exposing a router to Views.
export const MenuNavigationContext = createContext<{ hash: string; select: (id: string) => void } | null>(null);
