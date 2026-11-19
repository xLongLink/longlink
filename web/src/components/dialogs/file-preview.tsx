import { NativeFile } from '@/components/custom/native-file';
import { Dialog } from '@/components/longlink/layout/dialog';

/** Displays documents and media with the shared file renderer. */
export function FilePreview({
    body,
    title,
    onOpenChange
}: {
    onOpenChange: (open: boolean) => void;
    body: Blob;
    title: string;
}) {
    return (
        <Dialog open fullscreen onOpenChange={onOpenChange} title={title}>
            <div className="h-full min-h-0">
                <NativeFile body={body} title={title} highlight />
            </div>
        </Dialog>
    );
}
