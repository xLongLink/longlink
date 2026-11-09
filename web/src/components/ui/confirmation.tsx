import { ReportedError } from '@/lib/reported';
import { ConfirmationDialog } from './ConfirmationDialog';
import { useCallback, useEffect, useRef, useState } from 'react';

export type ConfirmOptions = {
    title: string;
    description?: string;
    cancelLabel?: string;
    actionLabel: string;
    actionVariant?: 'primary' | 'secondary' | 'destructive';
    onAction: () => void | Promise<void>;
};

/** Owns a compact confirmation; render element once in the calling component's JSX. */
export function useConfirm() {
    const [options, setOptions] = useState<ConfirmOptions | null>(null);
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const pending = useRef(false);
    const mounted = useRef(false);

    // Ignore settled actions after their owning View has unmounted.
    useEffect(() => {
        mounted.current = true;

        return () => {
            mounted.current = false;
        };
    }, []);

    // A running server operation cannot be canceled by dismissing or replacing its dialog.
    const show = useCallback((next: ConfirmOptions) => {
        if (pending.current) return;
        setError(null);
        setOptions(next);
    }, []);

    const hide = useCallback(() => {
        if (pending.current) return;
        setOptions(null);
        setError(null);
    }, []);

    /** Closes only after success and retains failed confirmations for retry. */
    async function submit() {
        if (!options || pending.current) return;
        pending.current = true;
        setIsPending(true);
        setError(null);

        // Scoped request failures are already reported by the host.
        try {
            await options.onAction();

            if (mounted.current) setOptions(null);
        } catch (failure) {
            if (mounted.current && !(failure instanceof ReportedError)) {
                setError(failure instanceof Error ? failure.message : 'The action failed. Please try again.');
            }
        } finally {
            pending.current = false;

            if (mounted.current) setIsPending(false);
        }
    }

    // Keep modal activity tied to the rendered element, not merely a call to show().
    return {
        show,
        hide,
        isOpen: options !== null,
        element: options ? (
            <ConfirmationDialog
                options={options}
                isPending={isPending}
                error={error}
                onCancel={hide}
                onAction={submit}
            />
        ) : null,
    };
}
