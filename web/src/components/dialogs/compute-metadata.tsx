import type { z } from 'zod';
import { Dialog, type DialogProps } from '@/components/custom/dialog';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import type * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { NativeButton as Button } from '@/components/custom/native-button';

export function ComputeMetadata({
    metadata,
    onDelete,
    ...dialogProps
}: DialogProps & { metadata: z.output<typeof schemas.zComputeRegistryResponse>; onDelete: () => void }) {
    return (
        <Dialog title="Compute metadata" {...dialogProps}>
            <Stack gap={2} padding={8}>
                <span>
                    <b>Gateway</b> {metadata.gateway_url}
                </span>
                <span>
                    <b>Database storage class</b> {metadata.database_storage_class}
                </span>
                <span>
                    <b>ID</b> {metadata.id}
                </span>
                <span>
                    <b>Storage endpoint</b> {metadata.storage_endpoint}
                </span>
                <Stack direction="horizontal" justify="end">
                    <Button label="Delete" variant="destructive" onClick={onDelete} />
                </Stack>
            </Stack>
        </Dialog>
    );
}
