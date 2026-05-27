/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL?: string;
    readonly VITE_DEV_PORT?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

declare module '*.md' {
    export const content: import('react').ReactNode;
    export const metadata: import('@/lib/markdown').MarkdownDocMetadata;
    const markdown: import('react').ReactNode;

    export default markdown;
}
