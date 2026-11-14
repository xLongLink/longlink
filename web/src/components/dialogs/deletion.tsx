import { useRef, useTransition } from 'react';
import { X, LoaderCircle } from 'lucide-react';
import { Text } from '@/components/custom/text';
import { Button } from '@/components/shadcn/button';
import { Heading } from '@/components/custom/heading';
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
    const [isDeleting, startDeletion] = useTransition();
    const deletionInFlight = useRef(false);
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
            className="relative min-w-0"
            disabled={isDeleting}
            focusableWhenDisabled
            aria-busy={isDeleting || undefined}
            aria-label={isDeleting ? 'Delete' : undefined}
            onClick={() => {
                // Deduplicate same-tick clicks before the transition's pending state renders.
                if (deletionInFlight.current) return;

                deletionInFlight.current = true;
                startDeletion(async () => {
                    // Release the guard without swallowing transition errors.
                    try {
                        await confirmation.onDelete();
                    } finally {
                        deletionInFlight.current = false;
                    }
                });
            }}
        >
            <span
                className="view-action-content flex min-w-0 max-w-full flex-1 items-center justify-center gap-[inherit]"
                aria-hidden={isDeleting || undefined}
            >
                <span className="min-w-0 overflow-hidden text-ellipsis">Delete</span>
            </span>
            {isDeleting && <LoaderCircle aria-hidden="true" className="view-action-spinner" />}
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
                        <Heading level={2}>{confirmation.title}</Heading>
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
                    <Text className="text-muted-foreground">{confirmation.description}</Text>
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
