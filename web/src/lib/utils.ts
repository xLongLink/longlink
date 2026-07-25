import { useState, type ReactNode } from 'react';

const dateFormatter = new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
});
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    month: 'numeric',
    second: 'numeric',
    year: 'numeric',
});
const numberFormatter = new Intl.NumberFormat();

export type DeleteConfirmationProps = {
    open: boolean;
    title: string;
    description: ReactNode;
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
    onError: (message: string) => void;
};

/** Formats a date-like value with the shared LongLink date style. */
export function formatDate(value: string | number | Date): string {
    return dateFormatter.format(new Date(value));
}

/** Formats a date-like value with the shared LongLink date/time style. */
export function formatDateTime(value: string | number | Date): string {
    return dateTimeFormatter.format(new Date(value));
}

/** Formats a number with the shared LongLink locale-aware style. */
export function formatNumber(value: number): string {
    return numberFormatter.format(value);
}

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

    return `${formatNumber(Math.round(value))} ${units[unit]}`;
}

/** Returns compact avatar initials for a display name. */
export function getInitials(value: string | null | undefined): string {
    // Fall back when no display name is available.
    const name = value?.trim() ?? '';
    if (!name) return '--';

    const words = name.split(/\s+/).filter(Boolean);
    const segmenter =
        typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;

    // Use up to two words when available.
    if (words.length > 1) {
        return words
            .slice(0, 2)
            .map((word) => {
                // Use grapheme segmentation when the browser supports it.
                if (segmenter) {
                    const [first] = segmenter.segment(word);

                    return first?.segment ?? '';
                }

                return Array.from(word)[0] ?? '';
            })
            .join('')
            .toUpperCase();
    }

    const letters = segmenter
        ? Array.from(segmenter.segment(words[0]), (entry) => entry.segment)
        : Array.from(words[0]);

    return letters.slice(0, 2).join('').toUpperCase();
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

    /** Clears the selected delete target. */
    function close() {
        setTargetId(null);
    }

    return {
        target,
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
                    close();
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
                    close();
                } catch (mutationError) {
                    onError(mutationError instanceof Error ? mutationError.message : errorMessage);
                }
            },
        } satisfies DeleteConfirmationProps,
    };
}
