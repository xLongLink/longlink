import { useTransition } from 'react';
import { AlertDialog } from '@astryxdesign/core/AlertDialog';

/** Keeps deletion pending state alive across dismissal; callers own the resource and success-only closure. */
export function DeletionDialog({
    confirmation,
    onClose,
}: {
    confirmation: { title: string; description: string; onDelete: () => Promise<void> } | null;
    onClose: () => void;
}) {
    // Remain mounted for the section's lifetime, including while its confirmation is absent.
    const [isDeleting, startDeletion] = useTransition();

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
            onAction={() => startDeletion(confirmation.onDelete)}
        />
    );
}
