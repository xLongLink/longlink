import { Dialog } from '@/components/custom/native-dialog';
import { NativeFile } from '@/components/custom/native-file';
import { DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';

/** Displays host-fetched PDF and media bytes with their native viewer layout. */
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
        <Dialog fullscreen {...dialogProps}>
            <DialogContent className="flex h-[95dvh] w-[95dvw] max-w-[95dvw] flex-col sm:max-w-[95dvw]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <div className="min-h-0 flex-1 overflow-auto">
                    <NativeFile body={body} title={title} />
                </div>
            </DialogContent>
        </Dialog>
    );
}
