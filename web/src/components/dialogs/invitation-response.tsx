import { Dialog } from './dialog';
import { NativeText as Text } from '@/components/custom/native-text';
import { NativeButton as Button } from '@/components/ui/native-button';
import { NativeStack as Stack } from '@/components/custom/native-stack';

export function InvitationResponse({
    invitation,
    onClose,
    onConfirm
}: {
    invitation: { type: 'accept' | 'decline'; name: string };
    onClose: () => void;
    onConfirm: () => Promise<void>;
}) {
    return (
        <Dialog
            isOpen
            title={invitation.type === 'accept' ? 'Accept invitation' : 'Decline invitation'}
            onOpenChange={(open) => !open && onClose()}
        >
            <Stack gap={3}>
                <Text className="text-muted-foreground">
                    {invitation.type === 'accept'
                        ? `Accept the invitation to join ${invitation.name}?`
                        : `Decline the invitation to ${invitation.name}? You will need a new invitation to join.`}
                </Text>
                <Stack direction="horizontal" gap={2} justify="end">
                    <Button label="Cancel" variant="ghost" onClick={onClose} />
                    <Button
                        label={invitation.type === 'accept' ? 'Accept' : 'Decline'}
                        variant={invitation.type === 'accept' ? 'default' : 'destructive'}
                        clickAction={onConfirm}
                    />
                </Stack>
            </Stack>
        </Dialog>
    );
}
