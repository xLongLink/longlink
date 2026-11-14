import type { z } from 'zod';
import { Dialog } from './dialog';
import { NativeText as Text } from '@/components/custom/native-text';
import { NativeButton as Button } from '@/components/ui/native-button';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import type * as schemas from '@/lib/generated/platform-api-v1/zod.gen';

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
        <Dialog title="Organization metadata" isOpen onOpenChange={(open) => !open && onClose()}>
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
        </Dialog>
    );
}
