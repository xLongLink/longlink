import { NativeText as Text } from '@/components/custom/native-text';
import { Dialog, type DialogProps } from '@/components/custom/dialog';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { NativeButton as Button } from '@/components/custom/native-button';

export function InvitationResponse({
    invitation,
    onClose,
    onConfirm,
    ...dialogProps
}: DialogProps & { invitation: { type: 'accept' | 'decline'; name: string }; onConfirm: () => Promise<void> }) {
    return (
        <Dialog
            title={invitation.type === 'accept' ? 'Accept invitation' : 'Decline invitation'}
            {...dialogProps}
            onClose={onClose}
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
