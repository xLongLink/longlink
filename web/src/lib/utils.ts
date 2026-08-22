import { useState, type ReactNode } from 'react';

export const dateFormatter = new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
});
export const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    month: 'numeric',
    second: 'numeric',
    year: 'numeric',
});
export const numberFormatter = new Intl.NumberFormat();

export type DeleteConfirmationProps = {
    open: boolean;
    title: string;
    description: ReactNode;
    isPending: boolean;
    onConfirm: () => void;
    onOpenChange: (open: boolean) => void;
};

type UseDeleteDialogOptions<TItem> = {
    title: string;
    mutation: { isPending: boolean; mutateAsync: (id: string) => Promise<unknown> };
    items: TItem[];
    getId: (item: TItem) => string;
    description: (item: TItem) => ReactNode;
    errorMessage: string;
    fallbackDescription: ReactNode;
    onError: (message: string) => void;
};

/** Formats bytes using binary units for admin resource tables. */
export function formatBytes(bytes: number): string {
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    let value = bytes;
    let unit = 0;

    // Scale bytes until they fit the current unit.
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit++;
    }

    return `${numberFormatter.format(Math.round(value))} ${units[unit]}`;
}

/** Converts kebab-case, snake_case, or camelCase text into space-separated words with leading capitals. */
export function startCase(value: string): string {
    const spaced = value.replace(/([a-z0-9])([A-Z])/g, '$1 $2');

    return spaced
        .split(/[^a-zA-Z0-9]+/)
        .filter((word) => word.length > 0)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
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
    onError,
}: UseDeleteDialogOptions<TItem>) {
    const [targetId, setTargetId] = useState<string | null>(null);
    const target = targetId === null ? null : (items.find((item) => getId(item) === targetId) ?? null);

    return {
        openFor: (item: TItem) => {
            setTargetId(getId(item));
        },
        dialogProps: {
            open: targetId !== null,
            title,
            description: target ? description(target) : fallbackDescription,
            isPending: mutation.isPending,
            onOpenChange: (open: boolean) => {
                // Closing the dialog clears its selected item.
                if (!open) {
                    setTargetId(null);
                }
            },
            onConfirm: async () => {
                // Ignore confirmations without a selected target.
                if (targetId === null) {
                    return;
                }

                // Run the delete mutation and surface any failure.
                try {
                    await mutation.mutateAsync(targetId);
                    setTargetId(null);
                } catch (mutationError) {
                    onError(mutationError instanceof Error ? mutationError.message : errorMessage);
                }
            },
        } satisfies DeleteConfirmationProps,
    };
}
