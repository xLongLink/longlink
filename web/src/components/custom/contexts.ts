import { createContext } from 'react';

export const ControlSizeContext = createContext<'sm' | 'md' | 'lg' | null>(null);

export const DialogActivityContext = createContext<((open: boolean, fullscreen: boolean) => void) | null>(null);

// The sandbox supplies a host navigation capability; native previews use ordinary links.
export const LinkNavigationContext = createContext<{
    baseUrl: string;
    navigate: (path: string, newTab?: boolean) => void;
} | null>(null);

// Each runtime supplies its own fragment navigation without exposing a router to Views.
export const MenuNavigationContext = createContext<{ hash: string; select: (id: string) => void } | null>(null);
