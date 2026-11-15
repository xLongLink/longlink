import type { z } from 'zod';
import { Dialog } from '@/components/custom/dialog';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import type * as schemas from '@/lib/generated/platform-api-v1/zod.gen';

export function OperationMetadata({
    metadata,
    onClose
}: {
    metadata: z.output<typeof schemas.zOperationResponse>;
    onClose: () => void;
}) {
    return (
        <Dialog title="Operation metadata" onClose={onClose}>
            <Stack gap={2} padding={8}>
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
