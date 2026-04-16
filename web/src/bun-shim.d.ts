// Extend ImportMeta to support Bun's import.meta.main
interface ImportMeta {
    readonly main: boolean;
}
