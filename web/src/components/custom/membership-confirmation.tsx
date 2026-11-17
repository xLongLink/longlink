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

export function MembershipConfirmation({
    title,
    description,
    actionLabel,
    destructive,
    open,
    onOpenChange,
    onConfirm
}: {
    title: string;
    description: string;
    actionLabel: string;
    destructive: boolean;
    open: boolean;
    onOpenChange: (open: boolean) => void;
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
                disabled={pending && destructive}
                onClick={() => onOpenChange(false)}
            >
                Cancel
            </Button>
            <Button
                type="button"
                variant={destructive ? 'destructive' : 'primary'}
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
                {actionLabel}
            </Button>
            <span role="status" className="sr-only">
                {pending ? 'Loading' : ''}
            </span>
        </>
    );

    if (destructive) {
        return (
            <AlertDialog
                open={open}
                onOpenChange={(nextOpen) => {
                    if (!pending && !inFlight.current) onOpenChange(nextOpen);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{title}</AlertDialogTitle>
                        <AlertDialogDescription>{description}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>{footer}</AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        );
    }

    return <Dialog open={open} onOpenChange={onOpenChange} title={title} description={description} footer={footer} />;
}
