import { Text } from './Text';
import { Stack } from './Stack';
import { Button } from './Button';
import { Spinner } from '@astryxdesign/core/Spinner';
import { createContext, useContext, useEffect, useState } from 'react';

// Only the isolated runtime supplies the scoped binary-request capability.
export const FileRequestContext = createContext<((path: string) => Promise<unknown>) | null>(null);

/** Requests an image preview only after the user opens it. */
export function FileViewer({ src, title }: { src: string; title: string }) {
    const [open, setOpen] = useState(false);

    // Each opened attachment owns a fresh preview and its blob URL.
    return (
        <Stack gap={2}>
            <Button variant="ghost" label={title} onClick={() => setOpen(!open)} />
            {open && <FilePreview key={src} src={src} title={title} />}
        </Stack>
    );
}

/** Releases image resources when the preview closes or its request capability changes. */
function FilePreview({ src, title }: { src: string; title: string }) {
    const request = useContext(FileRequestContext);
    const [preview, setPreview] = useState<
        { status: 'loading' } | { status: 'error' } | { status: 'ready'; url: string }
    >({ status: 'loading' });

    // Reject unsupported media rather than loading a privileged document frame.
    useEffect(() => {
        let active = true;
        let objectUrl: string | undefined;

        // Keep scoped requests and URL ownership local to this attachment attempt.
        async function load() {
            try {
                const value = await request?.(src);
                if (!active) return;
                if (!(value instanceof Blob) || !value.type.startsWith('image/')) {
                    setPreview({ status: 'error' });
                    return;
                }
                objectUrl = URL.createObjectURL(value);
                setPreview({ status: 'ready', url: objectUrl });
            } catch {
                if (active) setPreview({ status: 'error' });
            }
        }
        void load();
        return () => {
            active = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [request, src]);

    // Render only the current mounted attempt's loading, error, or image state.
    return preview.status === 'error' ? (
        <Text>Preview unavailable for this file type.</Text>
    ) : preview.status === 'ready' ? (
        <img src={preview.url} alt={title} className="max-h-full max-w-full rounded-lg object-contain" />
    ) : (
        <Spinner label="Loading attachment" />
    );
}
