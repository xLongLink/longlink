import { NativeFile } from '@/components/custom/native-file';
import { Dialog, type DialogProps } from '@/components/custom/dialog';

/** Displays host-fetched PDF and media bytes with their native viewer layout. */
export function FilePreview({
    body,
    title,
    type,
    ...dialogProps
}: DialogProps & { body: Blob; title: string; type: 'pdf' | 'media' }) {
    return (
        <Dialog
            title={title}
            variant="fullscreen"
            paddingInline={type === 'pdf' ? 0 : undefined}
            gap={type === 'pdf' ? 0 : undefined}
            {...dialogProps}
        >
            {type === 'pdf' ? (
                <div className="h-full min-h-0 w-full flex-1">
                    <NativeFile body={body} title={title} />
                </div>
            ) : (
                <NativeFile body={body} title={title} />
            )}
        </Dialog>
    );
}
