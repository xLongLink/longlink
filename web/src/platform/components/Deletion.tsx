import { useRef, useTransition } from 'react';
import { AlertDialog } from '@astryxdesign/core/AlertDialog';

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

    if (!confirmation) return null;

    // Preserve the existing 400px AlertDialog layout and transition-based failure propagation.
    return (
        <AlertDialog
            isOpen
            title={confirmation.title}
            description={confirmation.description}
            actionLabel="Delete"
            isActionLoading={isDeleting}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
            onAction={() => {
                // Deduplicate same-tick clicks before the transition's pending state renders.
                if (deletionInFlight.current) return;

                deletionInFlight.current = true;
                startDeletion(async () => {
                    // Release the guard on success or failure without swallowing transition errors.
                    try {
                        await confirmation.onDelete();
                    } finally {
                        deletionInFlight.current = false;
                    }
                });
            }}
        />
    );
}
