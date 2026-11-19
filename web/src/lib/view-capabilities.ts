import { createContext } from 'react';
import type { ViewData, RequestOptions } from '@/views/protocol';

export const RequestContext = createContext<{
    request: (path: string, options?: RequestOptions) => Promise<ViewData>;
    download: (path: string, filename: string) => Promise<void>;
} | null>(null);

export const DialogActivityContext = createContext<((open: boolean) => void) | null>(null);

// The sandbox supplies a host navigation capability; native previews use ordinary links.
export const LinkNavigationContext = createContext<{ baseUrl: string; navigate: (path: string) => void } | null>(null);

// Each runtime supplies its own fragment navigation without exposing a router to Views.
export const MenuNavigationContext = createContext<{ hash: string; select: (id: string) => void } | null>(null);
