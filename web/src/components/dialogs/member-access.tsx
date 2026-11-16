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

export function MemberAccess({
    name,
    action,
    onOpenChange,
    onConfirm,
    ...dialogProps
}: { open: boolean; onOpenChange: (open: boolean) => void } & {
    name: string;
    action: { kind: 'role'; role: string } | { kind: 'remove' };
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
                disabled={pending && action.kind === 'remove'}
                onClick={() => onOpenChange(false)}
            >
                Cancel
            </Button>
            <Button
                type="button"
                variant={action.kind === 'remove' ? 'destructive' : 'primary'}
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
                {action.kind === 'remove' ? 'Remove member' : 'Confirm'}
            </Button>
            <span role="status" className="sr-only">
                {pending ? 'Loading' : ''}
            </span>
        </>
    );

    if (action.kind === 'remove') {
        return (
            <AlertDialog
                {...dialogProps}
                onOpenChange={(open) => {
                    if (!pending && !inFlight.current) onOpenChange(open);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove member</AlertDialogTitle>
                        <AlertDialogDescription>
                            Remove {name} from this organization? Access is revoked immediately.
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
            title="Change role"
            description={`Change ${name} to ${action.role}?`}
            footer={footer}
        />
    );
}
