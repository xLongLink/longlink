import type { z } from 'zod';
import { Button } from '@/components/shadcn/button';
import { Dialog } from '@/components/custom/native-dialog';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import type * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';

export function OrganizationMetadata({
    metadata,
    onDelete,
    ...dialogProps
}: { open: boolean; onOpenChange: (open: boolean) => void } & {
    metadata: z.output<typeof schemas.zOrganizationIdentity>;
    onDelete: () => void;
}) {
    return (
        <Dialog {...dialogProps}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Organization metadata</DialogTitle>
                </DialogHeader>
                <Stack gap={2} className="max-h-[80dvh] overflow-auto">
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
            </DialogContent>
        </Dialog>
    );
}
