import { clsx, type ClassValue } from 'clsx';
import { useState, type ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

export type DeleteConfirmationDialogProps = {
    open: boolean;
    title: string;
    description: ReactNode;
    error?: string | null;
    isPending: boolean;
    onConfirm: () => void;
    onOpenChange: (open: boolean) => void;
};

type DeleteMutation = {
    isPending: boolean;
    mutateAsync: (id: string) => Promise<unknown>;
};

type UseDeleteDialogOptions<TItem> = {
    title: string;
    mutation: DeleteMutation;
    items: TItem[];
    getId: (item: TItem) => string;
    description: (item: TItem) => ReactNode;
    errorMessage: string;
    fallbackDescription: ReactNode;
};

/**
 * Merges class names using clsx and tailwind-merge for conflict-free styling.
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/** Formats bytes using binary units for admin resource tables. */
export function formatBytes(bytes: number): string {
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    let value = bytes;
    let unit = 0;

    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit++;
    }

    return `${Math.round(value)} ${units[unit]}`;
}

/** Manages the shared delete confirmation dialog state and confirm action. */
export function useDeleteDialog<TItem>({
    title,
    mutation,
    items,
    getId,
    description,
    errorMessage,
    fallbackDescription,
}: UseDeleteDialogOptions<TItem>) {
    const [targetId, setTargetId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const target = targetId === null ? null : (items.find((item) => getId(item) === targetId) ?? null);

    /** Clears the selected delete target and any previous error. */
    function close() {
        setTargetId(null);
        setError(null);
    }

    return {
        target,
        openFor: (item: TItem) => {
            setTargetId(getId(item));
            setError(null);
        },
        dialogProps: {
            open: targetId !== null,
            title,
            description: target ? description(target) : fallbackDescription,
            error,
            isPending: mutation.isPending,
            onOpenChange: (open: boolean) => {
                if (!open) {
                    close();
                }
            },
            onConfirm: async () => {
                if (targetId === null) {
                    return;
                }

                try {
                    await mutation.mutateAsync(targetId);
                    close();
                } catch (mutationError) {
                    setError(mutationError instanceof Error ? mutationError.message : errorMessage);
                }
            },
        } satisfies DeleteConfirmationDialogProps,
    };
}
