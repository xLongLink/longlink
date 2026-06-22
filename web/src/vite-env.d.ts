/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL?: string;
    readonly VITE_DEV_PORT?: string;
    readonly VERSION?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

declare module '*?worker' {
    const WorkerFactory: { new (): Worker };

    export default WorkerFactory;
}
