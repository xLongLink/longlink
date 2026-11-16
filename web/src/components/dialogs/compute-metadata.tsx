import type { z } from 'zod';
import { Button } from '@/components/longlink/action/button';
import { Dialog } from '@/components/longlink/layout/dialog';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import type * as schemas from '@/lib/generated/platform-api-v1/zod.gen';

export function ComputeMetadata({
    metadata,
    onDelete,
    ...dialogProps
}: { open: boolean; onOpenChange: (open: boolean) => void } & {
    metadata: z.output<typeof schemas.zComputeRegistryResponse>;
    onDelete: () => void;
}) {
    return (
        <Dialog
            {...dialogProps}
            title="Compute metadata"
            footer={
                <Button type="button" variant="destructive" onClick={onDelete}>
                    Delete
                </Button>
            }
        >
            <Stack gap={2}>
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
            </Stack>
        </Dialog>
    );
}
