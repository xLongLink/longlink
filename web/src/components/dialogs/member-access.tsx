import { FramedDialog } from '@/components/custom/framed-dialog';
import { NativeText as Text } from '@/components/custom/native-text';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { NativeButton as Button } from '@/components/custom/native-button';

export function MemberAccess({
    name,
    action,
    onClose,
    onConfirm
}: {
    name: string;
    action: { kind: 'role'; role: string } | { kind: 'remove' };
    onClose: () => void;
    onConfirm: () => Promise<void>;
}) {
    return (
        <FramedDialog
            open
            title={action.kind === 'remove' ? 'Remove member' : 'Change role'}
            onOpenChange={(open) => !open && onClose()}
        >
            <Stack gap={3}>
                <Text className="text-muted-foreground">
                    {action.kind === 'remove'
                        ? `Remove ${name} from this organization? Access is revoked immediately.`
                        : `Change ${name} to ${action.role}?`}
                </Text>
                <Stack direction="horizontal" gap={2} justify="end">
                    <Button label="Cancel" variant="ghost" onClick={onClose} />
                    <Button
                        label={action.kind === 'remove' ? 'Remove member' : 'Confirm'}
                        variant={action.kind === 'remove' ? 'destructive' : 'default'}
                        clickAction={onConfirm}
                    />
                </Stack>
            </Stack>
        </FramedDialog>
    );
}
