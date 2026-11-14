import type { z } from 'zod';
import { FramedDialog } from '@/components/custom/framed-dialog';
import { NativeText as Text } from '@/components/custom/native-text';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import type * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { NativeButton as Button } from '@/components/custom/native-button';

export function ComputeMetadata({
    metadata,
    onClose,
    onDelete
}: {
    metadata: z.output<typeof schemas.zComputeRegistryResponse>;
    onClose: () => void;
    onDelete: () => void;
}) {
    return (
        <FramedDialog title="Compute metadata" open onOpenChange={(open) => !open && onClose()}>
            <Stack gap={2} padding={8}>
                <Text>
                    <b>Gateway</b> {metadata.gateway_url}
                </Text>
                <Text>
                    <b>Database storage class</b> {metadata.database_storage_class}
                </Text>
                <Text>
                    <b>ID</b> {metadata.id}
                </Text>
                <Text>
                    <b>Storage endpoint</b> {metadata.storage_endpoint}
                </Text>
                <Stack direction="horizontal" justify="end">
                    <Button label="Delete" variant="destructive" onClick={onDelete} />
                </Stack>
            </Stack>
        </FramedDialog>
    );
}
