import { Text } from '@/components/ui/Text';
import { useRef, useTransition } from 'react';
import { X, LoaderCircle } from 'lucide-react';
import { Heading } from '@/components/ui/Heading';
import { Button } from '@/components/shadcn/button';
import { AlertDialog } from '@base-ui/react/alert-dialog';

/** Tracks deletion for its mounted lifetime; callers own the resource, mounting, and success-only closure. */
export function DeletionDialog({
    confirmation,
    onClose,
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
            <span className="view-action-content" aria-hidden={isDeleting || undefined}>
                <span className="view-action-label">Delete</span>
            </span>
            {isDeleting && <LoaderCircle aria-hidden="true" className="view-action-spinner" />}
        </Button>
    );

    // Preserve alert semantics and cancellation focus while adding explicit header dismissal.
    return (
        <AlertDialog.Root
            open
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <AlertDialog.Portal className="view-dialog-layer">
                <AlertDialog.Backdrop className="view-dialog-backdrop" />
                <AlertDialog.Popup
                    className="view-dialog view-confirmation deletion-dialog"
                    initialFocus={cancel}
                    aria-busy={isDeleting || undefined}
                    onClick={(event) => event.stopPropagation()}
                >
                    <header className="deletion-header">
                        <AlertDialog.Title render={<div />}>
                            <Heading level={2}>{confirmation.title}</Heading>
                        </AlertDialog.Title>
                        <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
                            <X aria-hidden="true" />
                        </Button>
                    </header>
                    <AlertDialog.Description className="deletion-description" render={<div />}>
                        <Text color="secondary">{confirmation.description}</Text>
                    </AlertDialog.Description>
                    <footer className="view-confirmation-actions">
                        {cancelButton}
                        {deleteButton}
                        <span role="status" className="sr-only">
                            {isDeleting ? 'Loading' : ''}
                        </span>
                    </footer>
                </AlertDialog.Popup>
            </AlertDialog.Portal>
        </AlertDialog.Root>
    );
}
