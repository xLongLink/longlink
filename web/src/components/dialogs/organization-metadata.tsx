import type { z } from 'zod';
import { Dialog } from '@/components/custom/dialog';
import { Button } from '@/components/shadcn/button';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import type * as schemas from '@/lib/generated/platform-api-v1/zod.gen';

export function OrganizationMetadata({
    metadata,
    onDelete,
    onClose
}: {
    metadata: z.output<typeof schemas.zOrganizationIdentity>;
    onDelete: () => void;
    onClose: () => void;
}) {
    return (
        <Dialog title="Organization metadata" onClose={onClose}>
            <Stack gap={2} padding={8}>
                <span>
                    <b>Status</b> {metadata.status}
                </span>
                <span>
                    <b>ID</b> {metadata.id}
                </span>
                <Stack direction="horizontal" justify="end">
                    <Button variant="destructive" onClick={onDelete}>
                        Delete
                    </Button>
                </Stack>
            </Stack>
        </Dialog>
    );
}
