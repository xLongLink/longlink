import type { z } from 'zod';
import { Stack } from '@/components/longlink/layout/stack';
import { Dialog } from '@/components/longlink/layout/dialog';
import type * as schemas from '@/lib/generated/platform-api-v1/zod.gen';

export function OperationMetadata({
    metadata,
    ...dialogProps
}: { open: boolean; onOpenChange: (open: boolean) => void } & {
    metadata: z.output<typeof schemas.zOperationResponse>;
}) {
    return (
        <Dialog {...dialogProps} title="Operation metadata">
            <Stack gap={2}>
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
        </Dialog>
    );
}
