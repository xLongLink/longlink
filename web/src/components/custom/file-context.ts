import { createContext } from 'react';

// Isolated Views reserve a slot while the host owns native document rendering.
export const FileViewerContext = createContext<
    ((element: HTMLElement, path: string, title: string) => () => void) | null
>(null);
