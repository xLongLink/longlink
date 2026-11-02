import { Stack } from './Stack';
import { Button } from './Button';
import { useContext, useState } from 'react';
import { ReportedError } from '@/lib/reported';
import { Text } from '@astryxdesign/core/Text';
import { Spinner } from '@astryxdesign/core/Spinner';
import { FileRequestContext, usePreview } from './preview';

/** Previews images on demand and downloads any attachment through the scoped host capability. */
export function FileViewer({
    src,
    title,
    size,
}: {
    /** Scoped Solution operation path returning the file to preview. */
    src: string;
    /** Attachment name used for accessible action labels and the downloaded filename. */
    title: string;
    /** Size of preview and download actions; use sm in compact tables. Omitted values retain inherited sizing. */
    size?: 'sm' | 'md' | 'lg';
}) {
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string>();
    const files = useContext(FileRequestContext);

    // Each opened attachment owns a fresh preview and its blob URL.
    return (
        <Stack gap={2}>
            <Stack direction="horizontal" gap={2} wrap="wrap">
                <Button variant="ghost" size={size} label={title} onClick={() => setOpen(!open)} />
                <Button
                    variant="ghost"
                    size={size}
                    label={`Download ${title}`}
                    onClick={async () => {
                        // Normalize an attachment label into a bounded filename, never a filesystem path.
                        setError(undefined);

                        try {
                            if (!files) throw new Error('Downloads require the Solution runtime');
                            const filename = title.replace(/[/\\\p{Cc}]/gu, '_').slice(0, 256) || 'attachment';
                            await files.download(src, filename);
                        } catch (failure) {
                            if (!(failure instanceof ReportedError)) {
                                setError(failure instanceof Error ? failure.message : 'Download failed');
                            }
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
    const preview = usePreview(src);

    // Render only the current mounted attempt's loading, error, or image state.
    return preview.status === 'unsupported' ? (
        <Text role="status">No image preview is available. Use Download to save this file.</Text>
    ) : preview.status === 'error' ? (
        <Text role="status">{preview.cause instanceof Error ? preview.cause.message : 'Preview failed'}</Text>
    ) : preview.status === 'ready' ? (
        <img src={preview.url} alt={title} className="max-h-full max-w-full rounded-lg object-contain" />
    ) : (
        <Spinner label="Loading attachment" />
    );
}
