import type { z } from 'zod';
import { Button } from '@/components/longlink/action/button';
import { Dialog } from '@/components/longlink/layout/dialog';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import type * as schemas from '@/lib/generated/platform-api-v1/zod.gen';

export function SolutionMetadata({
    metadata,
    onDelete,
    ...dialogProps
}: { open: boolean; onOpenChange: (open: boolean) => void } & {
    metadata: z.output<typeof schemas.zSolutionResponse>;
    onDelete: () => void;
}) {
    return (
        <Dialog
            {...dialogProps}
            title="Solution metadata"
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
                    <b>Organization</b> {metadata.organization.name}
                </span>
                <span>
                    <b>Desired image</b> {metadata.image_desired}
                </span>
                <span>
                    <b>Desired revision</b> {metadata.desired_revision_id ?? 'Not selected'}
                </span>
                <span>
                    <b>Last deployed revision</b> {metadata.deployed_revision_id ?? 'Never deployed'}
                </span>
                <span>
                    <b>ID</b> {metadata.id}
                </span>
                {metadata.description && (
                    <span>
                        <b>Description</b> {metadata.description}
                    </span>
                )}
                <span>
                    <b>Created</b> {metadata.created_at}
                </span>
            </Stack>
        </Dialog>
    );
}
