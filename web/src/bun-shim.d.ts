// Extend ImportMeta to support Bun's import.meta.main used by the reactxml package
interface ImportMeta {
    readonly main: boolean;
}
