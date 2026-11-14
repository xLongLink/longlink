import { NativeFile } from '@/components/custom/native-file';
import { FramedDialog } from '@/components/custom/framed-dialog';

export function MediaPreview({ body, title, onClose }: { body: Blob; title: string; onClose: () => void }) {
    return (
        <FramedDialog title={title} variant="fullscreen" open onOpenChange={(open) => !open && onClose()}>
            <NativeFile body={body} title={title} />
        </FramedDialog>
    );
}
