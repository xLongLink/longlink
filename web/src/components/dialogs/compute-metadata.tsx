import type { z } from 'zod';
import type { ComponentProps } from 'react';
import { Button } from '@/components/shadcn/button';
import { FramedDialog } from '@/components/custom/framed-dialog';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import type * as schemas from '@/lib/generated/platform-api-v1/zod.gen';

export function ComputeMetadata({
    metadata,
    onDelete,
    ...dialogProps
}: Pick<ComponentProps<typeof FramedDialog>, 'open' | 'onOpenChange'> & {
    metadata: z.output<typeof schemas.zComputeRegistryResponse>;
    onDelete: () => void;
}) {
    return (
        <FramedDialog title="Compute metadata" {...dialogProps}>
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
                    <Button variant="destructive" onClick={onDelete}>
                        Delete
                    </Button>
                </Stack>
            </Stack>
        </FramedDialog>
    );
}
