export type ViewCapabilities = {
    download: (path: string, filename: string) => Promise<void>;
    navigate: (path: string) => void;
};
