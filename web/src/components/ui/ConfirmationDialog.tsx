import { use, useEffect, useRef } from 'react';
import { Button } from '@/components/shadcn/button';
import type { ConfirmOptions } from './confirmation';
import { CircleX, LoaderCircle } from 'lucide-react';
import { ButtonGroupContext, ControlSizeContext, DialogActivityContext } from './contexts';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '@/components/shadcn/alert-dialog';

/** Presents scoped confirmations without the fixed frame used by general View dialogs. */
export function ConfirmationDialog({
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
                className="view-confirmation"
                style={{
                    top: 'calc(var(--view-viewport-top, 0px) + var(--view-viewport-height, 100dvh) / 2)',
                    maxHeight: 'calc(var(--view-viewport-height, 100dvh) - var(--spacing-10) * 2)'
                }}
                initialFocus={cancel}
                aria-busy={isPending || undefined}
                onClick={(event) => event.stopPropagation()}
            >
                <ButtonGroupContext value={null}>
                    <ControlSizeContext value={null}>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{options.title}</AlertDialogTitle>
                            {options.description && (
                                <AlertDialogDescription>{options.description}</AlertDialogDescription>
                            )}
                            {error && (
                                <div role="alert" className="view-confirmation-error">
                                    <CircleX aria-hidden="true" />
                                    <p>{error}</p>
                                </div>
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
                                variant={options.actionVariant === 'destructive' ? 'destructive' : 'default'}
                                className="relative min-w-0"
                                disabled={isPending}
                                focusableWhenDisabled
                                aria-busy={isPending || undefined}
                                aria-label={isPending ? options.actionLabel : undefined}
                                onClick={onAction}
                            >
                                <span className="view-action-content" aria-hidden={isPending || undefined}>
                                    <span className="view-action-label">{options.actionLabel}</span>
                                </span>
                                {isPending && <LoaderCircle aria-hidden="true" className="view-action-spinner" />}
                            </Button>
                            <span role="status" className="sr-only">
                                {isPending ? 'Loading' : ''}
                            </span>
                        </AlertDialogFooter>
                    </ControlSizeContext>
                </ButtonGroupContext>
            </AlertDialogContent>
        </AlertDialog>
    );
}
