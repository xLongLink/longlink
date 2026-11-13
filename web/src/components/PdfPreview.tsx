import { useEffect, useRef } from 'react';
import { ViewDialog } from '@/components/custom/ViewDialog';

/** Displays only host-fetched PDF bytes in the browser's native viewer. */
export function PdfPreview({ body, title, onClose }: { body: Blob; title: string; onClose: () => void }) {
    const frame = useRef<HTMLIFrameElement>(null);

    // Keep the document URL alive only while this PDF is displayed.
    useEffect(() => {
        const element = frame.current;

        if (!element) return;
        const url = URL.createObjectURL(body);
        element.src = url;

        return () => {
            element.removeAttribute('src');
            URL.revokeObjectURL(url);
        };
    }, [body]);

    // Render outside the Solution sandbox without granting it navigation or plugin permissions.
    return (
        <ViewDialog
            title={title}
            variant="fullscreen"
            isOpen
            onOpenChange={(open) => !open && onClose()}
            paddingInline={0}
            gap={0}
        >
            <iframe ref={frame} title={title} className="h-full min-h-0 w-full flex-1 border-0" />
        </ViewDialog>
    );
}
