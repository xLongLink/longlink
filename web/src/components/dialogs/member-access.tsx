import { Dialog } from './dialog';
import { NativeText as Text } from '@/components/custom/native-text';
import { NativeButton as Button } from '@/components/ui/native-button';
import { NativeStack as Stack } from '@/components/custom/native-stack';

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
        <Dialog
            isOpen
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
        </Dialog>
    );
}
