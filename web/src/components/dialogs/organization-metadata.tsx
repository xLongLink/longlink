import type { z } from 'zod';
import { FramedDialog } from '@/components/custom/framed-dialog';
import { NativeText as Text } from '@/components/custom/native-text';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import type * as schemas from '@/lib/generated/platform-api-v1/zod.gen';
import { NativeButton as Button } from '@/components/custom/native-button';

export function OrganizationMetadata({
    metadata,
    onClose,
    onDelete
}: {
    metadata: z.output<typeof schemas.zOrganizationIdentity>;
    onClose: () => void;
    onDelete: () => void;
}) {
    return (
        <FramedDialog title="Organization metadata" open onOpenChange={(open) => !open && onClose()}>
            <Stack gap={2} padding={8}>
                <Text>
                    <b>Status</b> {metadata.status}
                </Text>
                <Text>
                    <b>ID</b> {metadata.id}
                </Text>
                <Stack direction="horizontal" justify="end">
                    <Button label="Delete" variant="destructive" onClick={onDelete} />
                </Stack>
            </Stack>
        </FramedDialog>
    );
}
