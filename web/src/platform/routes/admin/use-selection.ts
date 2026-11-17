import { useState } from 'react';

type Selection = { kind: 'metadata'; id: string } | { kind: 'deletion'; item: { id: string; name: string } } | null;

/** Resolves live metadata while retaining only the identity needed for deletion. */
export function useAdminSelection<T extends { id: string; name: string }>(items: readonly T[]) {
    const [dialog, setDialog] = useState<Selection>(null);

    // Forget missing metadata so returning rows cannot reopen a dismissed selection.
    const metadata = dialog?.kind === 'metadata' ? items.find((item) => item.id === dialog.id) : undefined;

    if (dialog?.kind === 'metadata' && !metadata) setDialog(null);

    return {
        metadata,
        deletion: dialog?.kind === 'deletion' ? dialog.item : null,
        openMetadata: (id: string) => setDialog({ kind: 'metadata', id }),
        confirmDeletion: () => {
            if (metadata) setDialog({ kind: 'deletion', item: { id: metadata.id, name: metadata.name } });
        },
        close: () => setDialog(null)
    };
}
