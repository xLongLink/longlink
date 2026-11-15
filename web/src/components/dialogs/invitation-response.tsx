import { useApiError } from '@/lib/errors';
import { Button } from '@/components/shadcn/button';
import { FramedDialog } from '@/components/custom/framed-dialog';
import { useRef, useTransition, type ComponentProps } from 'react';
import { NativeStack as Stack } from '@/components/custom/native-stack';

export function InvitationResponse({
    invitation,
    onOpenChange,
    onConfirm,
    ...dialogProps
}: Omit<ComponentProps<typeof FramedDialog>, 'children'> & {
    invitation: { type: 'accept' | 'decline'; name: string };
    onConfirm: () => Promise<void>;
}) {
    const reportError = useApiError();
    const inFlight = useRef(false);
    const [pending, startConfirmation] = useTransition();

    return (
        <FramedDialog
            title={invitation.type === 'accept' ? 'Accept invitation' : 'Decline invitation'}
            {...dialogProps}
            onOpenChange={onOpenChange}
        >
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
        </FramedDialog>
    );
}
