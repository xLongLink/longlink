import { useApiError } from '@/lib/errors';
import { Button } from '@/components/longlink/action/button';
import { Dialog } from '@/components/longlink/layout/dialog';
import { useConfirmAction } from '@/lib/hooks/use-confirm-action';
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
    onOpenChange,
    onConfirm
}: {
    title: string;
    description: string;
    actionLabel: string;
    destructive: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => Promise<void>;
}) {
    const reportError = useApiError();
    const { isPending: pending, inFlight, run } = useConfirmAction();

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
                    run(async () => {
                        try {
                            await onConfirm();
                        } catch (cause) {
                            reportError(cause);
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
                open
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

    return <Dialog open onOpenChange={onOpenChange} title={title} description={description} footer={footer} />;
}
