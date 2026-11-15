import type { z } from 'zod';
import { Dialog, type DialogProps } from '@/components/custom/dialog';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import type * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { NativeButton as Button } from '@/components/custom/native-button';

export function OrganizationMetadata({
    metadata,
    onDelete,
    ...dialogProps
}: DialogProps & { metadata: z.output<typeof schemas.zOrganizationIdentity>; onDelete: () => void }) {
    return (
        <Dialog title="Organization metadata" {...dialogProps}>
            <Stack gap={2} padding={8}>
                <span>
                    <b>Status</b> {metadata.status}
                </span>
                <span>
                    <b>ID</b> {metadata.id}
                </span>
                <Stack direction="horizontal" justify="end">
                    <Button label="Delete" variant="destructive" onClick={onDelete} />
                </Stack>
            </Stack>
        </Dialog>
    );
}
