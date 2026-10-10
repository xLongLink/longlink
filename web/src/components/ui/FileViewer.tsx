import { Stack } from './Stack';
import { Button } from './Button';
import { Text } from '@astryxdesign/core/Text';
import { Spinner } from '@astryxdesign/core/Spinner';
import { createContext, useContext, useEffect, useState } from 'react';

// Only the isolated runtime supplies the scoped binary-request capability.
export const FileRequestContext = createContext<{
    preview: (path: string) => Promise<Blob>;
    download: (path: string, filename: string) => Promise<void>;
} | null>(null);

/** Previews images on demand and downloads any attachment through the scoped host capability. */
export function FileViewer({
    src,
    title,
    hidden,
}: {
    /** Hides the component without unmounting it. */
    hidden?: boolean;
    /** Scoped Solution operation path returning the file to preview. */
    src: string;
    /** Attachment name used for accessible action labels and the downloaded filename. */
    title: string;
}) {
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string>();
    const files = useContext(FileRequestContext);

    // Each opened attachment owns a fresh preview and its blob URL.
    return (
        <Stack gap={2} hidden={hidden}>
            <Stack direction="horizontal" gap={2} wrap="wrap">
                <Button variant="ghost" label={title} onClick={() => setOpen(!open)} />
                <Button
                    variant="ghost"
                    label={`Download ${title}`}
                    onClick={async () => {
                        // Normalize an attachment label into a bounded filename, never a filesystem path.
                        setError(undefined);

                        try {
                            if (!files) throw new Error('Downloads require the Solution runtime');
                            const filename = title.replace(/[/\\\p{Cc}]/gu, '_').slice(0, 256) || 'attachment';
                            await files.download(src, filename);
                        } catch (failure) {
                            setError(failure instanceof Error ? failure.message : 'Download failed');
                        }
                    }}
                />
            </Stack>
            {error && <Text role="alert">{error}</Text>}
            {open && <FilePreview key={src} src={src} title={title} />}
        </Stack>
    );
}

/** Releases image resources when the preview closes or its request capability changes. */
function FilePreview({ src, title }: { src: string; title: string }) {
    const request = useContext(FileRequestContext)?.preview;

    const [preview, setPreview] = useState<
        { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; url: string }
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
                    setPreview({
                        status: 'error',
                        message: 'No image preview is available. Use Download to save this file.',
                    });

                    return;
                }

                objectUrl = URL.createObjectURL(value);
                setPreview({ status: 'ready', url: objectUrl });
            } catch (failure) {
                if (active)
                    setPreview({
                        status: 'error',
                        message: failure instanceof Error ? failure.message : 'Preview failed',
                    });
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
        <Text role="status">{preview.message}</Text>
    ) : preview.status === 'ready' ? (
        <img src={preview.url} alt={title} className="max-h-full max-w-full rounded-lg object-contain" />
    ) : (
        <Spinner label="Loading attachment" />
    );
}
