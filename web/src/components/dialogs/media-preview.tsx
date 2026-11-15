import { NativeFile } from '@/components/custom/native-file';
import { Dialog, type DialogProps } from '@/components/custom/dialog';

export function MediaPreview({ body, title, ...dialogProps }: DialogProps & { body: Blob; title: string }) {
    return (
        <Dialog title={title} variant="fullscreen" {...dialogProps}>
            <NativeFile body={body} title={title} />
        </Dialog>
    );
}
