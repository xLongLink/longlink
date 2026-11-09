import { Stack } from './Stack';
import { Button } from './Button';
import { useEffect, useState } from 'react';
import { Text } from '@astryxdesign/core/Text';
import { useDownload, usePreview } from './preview';
import { Spinner } from '@astryxdesign/core/Spinner';

/** Previews images, PDFs, and plain text on demand and downloads attachments through the scoped host capability. */
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
    const attachment = useDownload();

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
                        await attachment.download(src, title);
                    }}
                />
            </Stack>
            {attachment.error && <Text role="alert">{attachment.error}</Text>}
            {open && <FilePreview key={src} src={src} title={title} onOpened={() => setOpen(false)} />}
        </Stack>
    );
}

/** Releases image resources locally while the host owns document previews. */
function FilePreview({ src, title, onOpened }: { src: string; title: string; onOpened: () => void }) {
    const preview = usePreview(src, false, title);

    // Reset the action after the host opens a document so it can be opened again after closing.
    useEffect(() => {
        if (preview.status === 'opened') onOpened();
    }, [preview.status, onOpened]);

    // Render only the current mounted attempt's loading, error, or image state.
    return preview.status === 'opened' ? null : preview.status === 'unsupported' ? (
        <Text role="status">No preview is available. Use Download to save this file.</Text>
    ) : preview.status === 'error' ? (
        <Text role="status">{preview.cause instanceof Error ? preview.cause.message : 'Preview failed'}</Text>
    ) : preview.status === 'ready' ? (
        <img src={preview.url} alt={title} className="max-h-full max-w-full rounded-lg object-contain" />
    ) : (
        <Spinner label="Loading attachment" />
    );
}
