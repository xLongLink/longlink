import { useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { useConfirmAction } from '@/lib/hooks/use-confirm-action';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter
} from '@/components/shadcn/alert-dialog';

/** Tracks deletion for its mounted lifetime; callers own the resource, mounting, and success-only closure. */
export function DeletionDialog({
    confirmation,
    onClose
}: {
    confirmation: { title: string; description: string; onDelete: () => Promise<void> } | null;
    onClose: () => void;
}) {
    // Preserve pending state across dismissal for callers that keep this component mounted.
    const { isPending: isDeleting, run } = useConfirmAction();
    const cancel = useRef<HTMLButtonElement>(null);

    if (!confirmation) return null;

    // Keep the least-destructive focus target and narrow-screen action order unchanged.
    const cancelButton = (
        <Button ref={cancel} type="button" variant="ghost" onClick={onClose}>
            Cancel
        </Button>
    );

    const deleteButton = (
        <Button
            type="button"
            variant="destructive"
            disabled={isDeleting}
            focusableWhenDisabled
            aria-busy={isDeleting || undefined}
            onClick={() => run(confirmation.onDelete)}
        >
            Delete
        </Button>
    );

    // Preserve alert semantics and cancellation focus while adding explicit header dismissal.
    return (
        <AlertDialog
            open
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <AlertDialogContent
                className="max-h-[75dvh] overflow-auto"
                initialFocus={cancel}
                aria-busy={isDeleting || undefined}
                onClick={(event) => event.stopPropagation()}
            >
                <header className="flex shrink-0 items-start justify-between gap-3">
                    <AlertDialogTitle
                        className="my-[calc(var(--spacing)*2-var(--text-3xl)*var(--text-3xl--line-height)/2)] min-w-0 flex-1"
                        render={<div />}
                    >
                        <h2 className="font-semibold tracking-tight text-3xl">{confirmation.title}</h2>
                    </AlertDialogTitle>
                    <Button
                        className="-my-2 -me-2"
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Close"
                        onClick={onClose}
                    >
                        <X aria-hidden="true" />
                    </Button>
                </header>
                <AlertDialogDescription render={<div />}>
                    <span className="text-muted-foreground">{confirmation.description}</span>
                </AlertDialogDescription>
                <AlertDialogFooter>
                    {cancelButton}
                    {deleteButton}
                    <span role="status" className="sr-only">
                        {isDeleting ? 'Loading' : ''}
                    </span>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
