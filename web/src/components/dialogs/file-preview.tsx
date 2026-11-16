import { NativeFile } from '@/components/custom/native-file';
import { Dialog } from '@/components/longlink/layout/dialog';

/** Displays host-fetched documents and media with the shared file renderer. */
export function FilePreview({
    body,
    title,
    ...dialogProps
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    body: Blob;
    title: string;
}) {
    return (
        <Dialog fullscreen {...dialogProps} title={title}>
            <div className="h-full min-h-0">
                <NativeFile body={body} title={title} />
            </div>
        </Dialog>
    );
}
