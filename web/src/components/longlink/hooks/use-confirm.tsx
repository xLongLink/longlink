import { CircleX } from 'lucide-react';
import { ReportedError } from '@/lib/reported';
import { Button } from '@/components/shadcn/button';
import { Alert, AlertDescription } from '@/components/reui/alert';
import { use, useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { ControlSizeContext, DialogActivityContext } from '@/components/custom/contexts';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '@/components/shadcn/alert-dialog';

export type ConfirmOptions = {
    title: string;
    description?: string;
    cancelLabel?: string;
    actionLabel: string;
    actionVariant?: 'default' | 'destructive';
    onAction: () => void | Promise<void>;
};

/** Owns a compact confirmation; render element once in the calling component's JSX. */
export function useConfirm() {
    const [options, setOptions] = useState<ConfirmOptions | null>(null);
    const [isPending, startAction] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const pending = useRef(false);

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
    function submit() {
        if (!options || pending.current) return;
        pending.current = true;
        setError(null);

        startAction(async () => {
            // Scoped request failures are already reported by the host.
            try {
                await options.onAction();
                setOptions(null);
            } catch (failure) {
                if (!(failure instanceof ReportedError)) {
                    setError(failure instanceof Error ? failure.message : 'The action failed. Please try again.');
                }
            } finally {
                pending.current = false;
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

    // Extend the sandbox backdrop for exactly the rendered modal's lifetime.
    useEffect(() => {
        activity?.(true, false);

        return () => activity?.(false, false);
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
                style={{
                    top: 'calc(var(--view-viewport-top, 0px) + var(--view-viewport-height, 100dvh) / 2)',
                    maxHeight: 'calc(var(--view-viewport-height, 100dvh) - var(--spacing) * 20)'
                }}
                initialFocus={cancel}
                aria-busy={isPending || undefined}
                onClick={(event) => event.stopPropagation()}
            >
                <ControlSizeContext value={null}>
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
                </ControlSizeContext>
            </AlertDialogContent>
        </AlertDialog>
    );
}
