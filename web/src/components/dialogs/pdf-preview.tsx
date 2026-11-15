import { NativeFile } from '@/components/custom/native-file';
import { Dialog, type DialogProps } from '@/components/custom/dialog';

/** Displays only host-fetched PDF bytes in the browser's native viewer. */
export function PdfPreview({ body, title, ...dialogProps }: DialogProps & { body: Blob; title: string }) {
    // Render outside the Solution sandbox without granting it navigation or plugin permissions.
    return (
        <Dialog title={title} variant="fullscreen" paddingInline={0} gap={0} {...dialogProps}>
            <div className="h-full min-h-0 w-full flex-1">
                <NativeFile body={body} title={title} />
            </div>
        </Dialog>
    );
}
