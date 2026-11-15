import { useApiError } from '@/lib/errors';
import { useRef, useTransition } from 'react';
import { Button } from '@/components/shadcn/button';
import { Dialog } from '@/components/custom/native-dialog';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';

export function InvitationResponse({
    invitation,
    onOpenChange,
    onConfirm,
    ...dialogProps
}: { open: boolean; onOpenChange: (open: boolean) => void } & {
    invitation: { type: 'accept' | 'decline'; name: string };
    onConfirm: () => Promise<void>;
}) {
    const reportError = useApiError();
    const inFlight = useRef(false);
    const [pending, startConfirmation] = useTransition();

    return (
        <Dialog {...dialogProps} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {invitation.type === 'accept' ? 'Accept invitation' : 'Decline invitation'}
                    </DialogTitle>
                </DialogHeader>
                <Stack gap={3}>
                    <span className="text-muted-foreground">
                        {invitation.type === 'accept'
                            ? `Accept the invitation to join ${invitation.name}?`
                            : `Decline the invitation to ${invitation.name}? You will need a new invitation to join.`}
                    </span>
                    <Stack direction="horizontal" gap={2} justify="end">
                        <Button variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant={invitation.type === 'accept' ? 'default' : 'destructive'}
                            disabled={pending}
                            aria-busy={pending || undefined}
                            onClick={() => {
                                // Guard immediate repeated clicks before pending state renders.
                                if (inFlight.current) return;
                                inFlight.current = true;
                                startConfirmation(async () => {
                                    try {
                                        await onConfirm();
                                    } catch (cause) {
                                        reportError(cause);
                                    } finally {
                                        inFlight.current = false;
                                    }
                                });
                            }}
                        >
                            {invitation.type === 'accept' ? 'Accept' : 'Decline'}
                        </Button>
                        <span role="status" className="sr-only">
                            {pending ? 'Loading' : ''}
                        </span>
                    </Stack>
                </Stack>
            </DialogContent>
        </Dialog>
    );
}
