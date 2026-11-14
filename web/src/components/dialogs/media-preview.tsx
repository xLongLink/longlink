import { Dialog } from './dialog';
import { NativeFile } from '@/components/custom/native-file';

export function MediaPreview({ body, title, onClose }: { body: Blob; title: string; onClose: () => void }) {
    return (
        <Dialog title={title} variant="fullscreen" isOpen onOpenChange={(open) => !open && onClose()}>
            <NativeFile body={body} title={title} />
        </Dialog>
    );
}
