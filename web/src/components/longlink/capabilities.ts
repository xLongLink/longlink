export type ViewCapabilities = {
    download: (path: string, filename: string) => Promise<void>;
    navigate: (path: string) => void;
};

/** Selects the session capabilities intentionally available to authored Views. */
export function bindViewCapabilities(capabilities: ViewCapabilities): ViewCapabilities {
    return { download: capabilities.download, navigate: capabilities.navigate };
}
