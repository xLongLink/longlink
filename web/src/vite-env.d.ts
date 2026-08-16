interface ImportMetaEnv {
    readonly VITE_API_URL?: string;
    readonly VITE_DEV_PORT?: string;
    readonly VITE_SITE_URL: string;
    readonly VERSION?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
