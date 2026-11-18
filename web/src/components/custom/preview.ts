import { createContext, useContext, useEffect, useState } from 'react';

// Only the isolated runtime supplies scoped file capabilities.
export const FileRequestContext = createContext<{
    load: (path: string) => Promise<Blob>;
    preview: (path: string, title: string) => Promise<void>;
    download: (path: string, filename: string) => Promise<void>;
} | null>(null);

type PreviewState = { status: 'loading' } | { status: 'unavailable' } | { status: 'ready'; url: string };

/** Owns a mounted image preview; inline images remain caller-owned. */
export function usePreview(src: string): PreviewState {
    const request = useContext(FileRequestContext)?.load;
    const inline = src.startsWith('data:image/') || src.startsWith('blob:');

    // Store only scoped previews that wait for their host response.
    const [preview, setPreview] = useState<PreviewState>({ status: 'loading' });

    // Keep each scoped request and its object URL within this mounted preview's lifetime.
    useEffect(() => {
        if (inline) return;

        let active = true;
        let objectUrl: string | undefined;

        /** Accepts image bytes and ignores responses after closing. */
        async function load() {
            try {
                if (!request) throw new Error('Image preview unavailable');
                const value = await request(src);

                if (!active) return;

                // Reject non-image responses without exposing their contents in the View.
                if (!value.type.startsWith('image/')) {
                    setPreview({ status: 'unavailable' });

                    return;
                }

                // oxlint-disable-next-line react/immutability -- Effect-local cleanup; oxc-project/oxc#28401.
                objectUrl = URL.createObjectURL(value);
                setPreview({ status: 'ready', url: objectUrl });
            } catch {
                if (active) setPreview({ status: 'unavailable' });
            }
        }

        void load();

        // Ignore late responses and release only URLs owned by this mounted preview.
        return () => {
            active = false;

            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [inline, request, src]);

    // Inline images are immediately ready without duplicating their source in state.
    return inline ? { status: 'ready', url: src } : preview;
}
