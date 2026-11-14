import type { z } from 'zod';
import { Dialog } from './dialog';
import { NativeText as Text } from '@/components/custom/native-text';
import { NativeButton as Button } from '@/components/ui/native-button';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import type * as schemas from '@/lib/generated/platform-api-v1/zod.gen';

export function SolutionMetadata({
    metadata,
    onClose,
    onDelete
}: {
    metadata: z.output<typeof schemas.zSolutionResponse>;
    onClose: () => void;
    onDelete: () => void;
}) {
    return (
        <Dialog title="Solution metadata" isOpen onOpenChange={(open) => !open && onClose()}>
            <Stack gap={2} padding={8}>
                <Text>
                    <b>Status</b> {metadata.status}
                </Text>
                <Text>
                    <b>Organization</b> {metadata.organization.name}
                </Text>
                <Text>
                    <b>Desired image</b> {metadata.image_desired}
                </Text>
                <Text>
                    <b>Desired revision</b> {metadata.desired_revision_id ?? 'Not selected'}
                </Text>
                <Text>
                    <b>Last deployed revision</b> {metadata.deployed_revision_id ?? 'Never deployed'}
                </Text>
                <Text>
                    <b>ID</b> {metadata.id}
                </Text>
                {metadata.description && (
                    <Text>
                        <b>Description</b> {metadata.description}
                    </Text>
                )}
                <Text>
                    <b>Created</b> {metadata.created_at}
                </Text>
                <Stack direction="horizontal" justify="end">
                    <Button label="Delete" variant="destructive" onClick={onDelete} />
                </Stack>
            </Stack>
        </Dialog>
    );
}
