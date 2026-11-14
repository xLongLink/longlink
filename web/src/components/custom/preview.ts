import { ReportedError } from '@/lib/reported';
import { createContext, useContext, useEffect, useEffectEvent, useState } from 'react';

// Only the isolated runtime supplies scoped preview and download capabilities.
export const FileRequestContext = createContext<{
    preview: (path: string, title?: string) => Promise<Blob | null>;
    download: (path: string, filename: string) => Promise<void>;
} | null>(null);

/** Shares filename handling and local failures without duplicating host notifications. */
export function useDownload() {
    const files = useContext(FileRequestContext);
    const [error, setError] = useState<string>();

    /** Downloads an attachment through the scoped host capability. */
    async function download(path: string, name: string) {
        setError(undefined);

        // Normalize display names before crossing the runtime capability boundary.
        try {
            if (!files) throw new Error('Downloads require the Solution runtime');
            const filename = name.replace(/[/\\\p{Cc}]/gu, '_').slice(0, 256) || 'attachment';
            await files.download(path, filename);
        } catch (failure) {
            if (!(failure instanceof ReportedError)) {
                setError(failure instanceof Error ? failure.message : 'Download failed');
            }
        }
    }

    return { download, error };
}

type PreviewState =
    | { status: 'loading' }
    | { status: 'unsupported' }
    | { status: 'error'; cause: unknown }
    | { status: 'ready'; url: string };

/** Owns a mounted preview; inline images remain caller-owned and documents open in the host. */
export function usePreview(src: string, inline = false, title?: string, onOpened?: () => void): PreviewState {
    const request = useContext(FileRequestContext)?.preview;
    const notifyOpened = useEffectEvent(() => onOpened?.());

    // Store only scoped previews that wait for their host response.
    const [preview, setPreview] = useState<PreviewState>({ status: 'loading' });

    // Keep each scoped request and its object URL within this mounted preview's lifetime.
    useEffect(() => {
        if (inline) return;

        let active = true;
        let objectUrl: string | undefined;

        /** Accepts image bytes or a completed host preview and ignores responses after closing. */
        async function load() {
            try {
                const value = await request?.(src, title);

                if (!active) return;

                if (value === null && title !== undefined) {
                    notifyOpened();

                    return;
                }

                // Reject non-image responses without exposing their contents in the View.
                if (!(value instanceof Blob) || !value.type.startsWith('image/')) {
                    setPreview({ status: 'unsupported' });

                    return;
                }

                // oxlint-disable-next-line react/immutability -- Effect-local cleanup; oxc-project/oxc#28401.
                objectUrl = URL.createObjectURL(value);
                setPreview({ status: 'ready', url: objectUrl });
            } catch (cause) {
                if (active) setPreview({ status: 'error', cause });
            }
        }

        void load();

        // Ignore late responses and release only URLs owned by this mounted preview.
        return () => {
            active = false;

            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [inline, request, src, title]);

    // Inline images are immediately ready without duplicating their source in state.
    return inline ? { status: 'ready', url: src } : preview;
}
