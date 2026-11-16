import { useApiError } from '@/lib/errors';
import { useRef, useTransition } from 'react';
import { Button } from '@/components/longlink/action/button';
import { Dialog } from '@/components/longlink/layout/dialog';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '@/components/shadcn/alert-dialog';

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

    const footer = (
        <>
            <Button
                type="button"
                variant="outline"
                disabled={pending && invitation.type === 'decline'}
                onClick={() => onOpenChange(false)}
            >
                Cancel
            </Button>
            <Button
                type="button"
                variant={invitation.type === 'accept' ? 'primary' : 'destructive'}
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
        </>
    );

    if (invitation.type === 'decline') {
        return (
            <AlertDialog
                {...dialogProps}
                onOpenChange={(open) => {
                    if (!pending && !inFlight.current) onOpenChange(open);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Decline invitation</AlertDialogTitle>
                        <AlertDialogDescription>
                            Decline the invitation to {invitation.name}? You will need a new invitation to join.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>{footer}</AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        );
    }

    return (
        <Dialog
            {...dialogProps}
            onOpenChange={onOpenChange}
            title="Accept invitation"
            description={`Accept the invitation to join ${invitation.name}?`}
            footer={footer}
        />
    );
}
