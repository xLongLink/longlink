import type { z } from 'zod';
import { Button } from '@/components/longlink/action/button';
import { Dialog } from '@/components/longlink/layout/dialog';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import type * as schemas from '@/lib/generated/platform-api-v1/zod.gen';

export function OrganizationMetadata({
    metadata,
    onDelete,
    ...dialogProps
}: { open: boolean; onOpenChange: (open: boolean) => void } & {
    metadata: z.output<typeof schemas.zOrganizationIdentity>;
    onDelete: () => void;
}) {
    return (
        <Dialog
            {...dialogProps}
            title="Organization metadata"
            footer={
                <Button type="button" variant="destructive" onClick={onDelete}>
                    Delete
                </Button>
            }
        >
            <Stack gap={2}>
                <span>
                    <b>Status</b> {metadata.status}
                </span>
                <span>
                    <b>ID</b> {metadata.id}
                </span>
            </Stack>
        </Dialog>
    );
}
