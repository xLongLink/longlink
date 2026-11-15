import type { z } from 'zod';
import { NativeText as Text } from '@/components/custom/native-text';
import { Dialog, type DialogProps } from '@/components/custom/dialog';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import type * as schemas from '@/lib/generated/platform-api-v1/zod.gen';

export function OperationMetadata({
    metadata,
    ...dialogProps
}: DialogProps & { metadata: z.output<typeof schemas.zOperationResponse> }) {
    return (
        <Dialog title="Operation metadata" {...dialogProps}>
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
