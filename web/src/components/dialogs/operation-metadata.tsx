import type { z } from 'zod';
import { Dialog } from '@/components/custom/native-dialog';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import type * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';

export function OperationMetadata({
    metadata,
    ...dialogProps
}: { open: boolean; onOpenChange: (open: boolean) => void } & {
    metadata: z.output<typeof schemas.zOperationResponse>;
}) {
    return (
        <Dialog {...dialogProps}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Operation metadata</DialogTitle>
                </DialogHeader>
                <Stack gap={2} className="max-h-[80dvh] overflow-auto">
                    <span>
                        <b>Operation</b> {metadata.kind}
                    </span>
                    <span>
                        <b>Status</b> {metadata.status}
                    </span>
                    <span>
                        <b>ID</b> {metadata.id}
                    </span>
                    <span>
                        <b>Target</b> {metadata.target_id}
                    </span>
                    <span>
                        <b>Created</b> {metadata.created_at}
                    </span>
                    {metadata.finished_at && (
                        <span>
                            <b>Finished</b> {metadata.finished_at}
                        </span>
                    )}
                    {metadata.failed && (
                        <span>
                            <b>Reason</b> {metadata.failed}
                        </span>
                    )}
                </Stack>
            </DialogContent>
        </Dialog>
    );
}
