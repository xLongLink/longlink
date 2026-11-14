import type { z } from 'zod';
import { Dialog } from './dialog';
import { NativeText as Text } from '@/components/custom/native-text';
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
        <Dialog title="Operation metadata" isOpen onOpenChange={(open) => !open && onClose()}>
            <Stack gap={2} padding={8}>
                <Text>
                    <b>Operation</b> {metadata.kind}
                </Text>
                <Text>
                    <b>Status</b> {metadata.status}
                </Text>
                <Text>
                    <b>ID</b> {metadata.id}
                </Text>
                <Text>
                    <b>Target</b> {metadata.target_id}
                </Text>
                <Text>
                    <b>Created</b> {metadata.created_at}
                </Text>
                {metadata.finished_at && (
                    <Text>
                        <b>Finished</b> {metadata.finished_at}
                    </Text>
                )}
                {metadata.failed && (
                    <Text>
                        <b>Reason</b> {metadata.failed}
                    </Text>
                )}
            </Stack>
        </Dialog>
    );
}
