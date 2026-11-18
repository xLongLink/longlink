import { createContext } from 'react';

// Only the isolated runtime supplies scoped file capabilities.
export const FileRequestContext = createContext<{
    load: (path: string) => Promise<Blob>;
    preview: (path: string, title: string) => Promise<void>;
    download: (path: string, filename: string) => Promise<void>;
} | null>(null);
