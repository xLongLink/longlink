import { Text } from './Text';
import { Heading } from './Heading';
import { use, useEffect, useRef } from 'react';
import { Button } from '@/components/shadcn/button';
import type { ConfirmOptions } from './confirmation';
import { CircleX, LoaderCircle } from 'lucide-react';
import { AlertDialog } from '@base-ui/react/alert-dialog';
import { ButtonGroupContext, ControlSizeContext, DialogActivityContext } from './contexts';

/** Presents scoped confirmations without the fixed frame used by general View dialogs. */
export function ConfirmationDialog({
    options,
    isPending,
    error,
    onCancel,
    onAction,
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
        <AlertDialog.Root
            open
            onOpenChange={(open) => {
                if (!open && !isPending) onCancel();
            }}
        >
            <AlertDialog.Portal className="view-dialog-layer">
                <AlertDialog.Backdrop className="view-dialog-backdrop" />
                <AlertDialog.Popup
                    className="view-dialog view-confirmation"
                    initialFocus={cancel}
                    aria-busy={isPending || undefined}
                    onClick={(event) => event.stopPropagation()}
                >
                    <ButtonGroupContext value={null}>
                        <ControlSizeContext value={null}>
                            <div className="view-confirmation-content">
                                <AlertDialog.Title render={<div />}>
                                    <Heading level={2}>{options.title}</Heading>
                                </AlertDialog.Title>
                                {options.description && (
                                    <AlertDialog.Description render={<div />}>
                                        <Text color="secondary">{options.description}</Text>
                                    </AlertDialog.Description>
                                )}
                                {error && (
                                    <div role="alert" className="view-confirmation-error">
                                        <CircleX aria-hidden="true" />
                                        <p>{error}</p>
                                    </div>
                                )}
                            </div>
                            <div className="view-confirmation-actions">
                                <Button
                                    ref={cancel}
                                    variant="view"
                                    data-variant="ghost"
                                    data-size="md"
                                    disabled={isPending}
                                    focusableWhenDisabled
                                    onClick={() => {
                                        if (!isPending) onCancel();
                                    }}
                                >
                                    {options.cancelLabel ?? 'Cancel'}
                                </Button>
                                <Button
                                    variant="view"
                                    data-variant={options.actionVariant ?? 'primary'}
                                    data-size="md"
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
                            </div>
                        </ControlSizeContext>
                    </ButtonGroupContext>
                </AlertDialog.Popup>
            </AlertDialog.Portal>
        </AlertDialog.Root>
    );
}
