import { CircleX } from 'lucide-react';
import { ReportedError } from '@/lib/reported';
import { Button } from '@/components/shadcn/button';
import { DialogActivityContext } from '@/lib/view-capabilities';
import { Alert, AlertDescription } from '@/components/reui/alert';
import { useConfirmAction } from '@/lib/hooks/use-confirm-action';
import { use, useCallback, useEffect, useRef, useState } from 'react';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '@/components/shadcn/alert-dialog';

/** Options for a compact confirmation. @category Runtime @group Hooks */
export type ConfirmOptions = {
    title: string;
    description?: string;
    cancelLabel?: string;
    actionLabel: string;
    actionVariant?: 'default' | 'destructive';
    onAction: () => void | Promise<void>;
};

/**
 * Render element once. show(options) opens a compact confirmation with Cancel focused.
 * Actions show loading and close only after success. Failures keep the dialog open for retry.
 * While pending, duplicate actions, show(), hide(), Cancel, and Escape are ignored.
 * Cancel defaults to "Cancel"; actionVariant defaults to "default". Description is optional.
 * Scoped request errors are reported by the host; other errors appear in the dialog.
 * @category Runtime @group Hooks
 */
export function useConfirm() {
    const [options, setOptions] = useState<ConfirmOptions | null>(null);
    const { isPending, inFlight: pending, run } = useConfirmAction();
    const [error, setError] = useState<string | null>(null);

    // A running server operation cannot be canceled by dismissing or replacing its dialog.
    const show = useCallback(
        (next: ConfirmOptions) => {
            if (pending.current) return;
            setError(null);
            setOptions(next);
        },
        [pending]
    );

    const hide = useCallback(() => {
        if (pending.current) return;
        setOptions(null);
        setError(null);
    }, [pending]);

    /** Closes only after success and retains failed confirmations for retry. */
    function submit() {
        if (!options) return;
        run(async () => {
            setError(null);
            // Scoped request failures are already reported by the host.
            try {
                await options.onAction();
                setOptions(null);
            } catch (failure) {
                if (!(failure instanceof ReportedError)) {
                    setError(failure instanceof Error ? failure.message : 'The action failed. Please try again.');
                }
            }
        });
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
        ) : null
    };
}

/** Presents scoped confirmations without the fixed frame used by general View dialogs. */
function ConfirmationDialog({
    options,
    isPending,
    error,
    onCancel,
    onAction
}: {
    options: ConfirmOptions;
    isPending: boolean;
    error: string | null;
    onCancel: () => void;
    onAction: () => void;
}) {
    const activity = use(DialogActivityContext);
    const cancel = useRef<HTMLButtonElement>(null);

    // Coordinate the sandbox frame for exactly the rendered modal's lifetime.
    useEffect(() => {
        activity?.(true);

        return () => activity?.(false);
    }, [activity]);

    // Keep focus on the least destructive action and block dismissal during the request.
    return (
        <AlertDialog
            open
            onOpenChange={(open) => {
                if (!open && !isPending) onCancel();
            }}
        >
            <AlertDialogContent
                className="overflow-auto"
                style={{ maxHeight: 'calc(100dvh - var(--spacing) * 20)' }}
                initialFocus={cancel}
                aria-busy={isPending || undefined}
                onClick={(event) => event.stopPropagation()}
            >
                <AlertDialogHeader>
                    <AlertDialogTitle>{options.title}</AlertDialogTitle>
                    {options.description && <AlertDialogDescription>{options.description}</AlertDialogDescription>}
                    {error && (
                        <Alert variant="destructive">
                            <CircleX aria-hidden="true" />
                            <AlertDescription className="min-w-0 wrap-anywhere">{error}</AlertDescription>
                        </Alert>
                    )}
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <Button
                        ref={cancel}
                        type="button"
                        variant="ghost"
                        disabled={isPending}
                        focusableWhenDisabled
                        onClick={() => {
                            if (!isPending) onCancel();
                        }}
                    >
                        {options.cancelLabel ?? 'Cancel'}
                    </Button>
                    <Button
                        type="button"
                        variant={options.actionVariant === 'destructive' ? 'destructive' : 'primary'}
                        disabled={isPending}
                        focusableWhenDisabled
                        aria-busy={isPending || undefined}
                        onClick={onAction}
                    >
                        {options.actionLabel}
                    </Button>
                    <span role="status" className="sr-only">
                        {isPending ? 'Loading' : ''}
                    </span>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
