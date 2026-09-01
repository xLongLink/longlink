interface ImportMetaEnv {
    readonly VITE_SITE_URL: string;
    readonly VERSION?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
