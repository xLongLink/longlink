import { use, useEffect, useId } from 'react';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { DialogActivityContext } from './contexts';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Dialog } from '@astryxdesign/core/Dialog';
import type { ConfirmOptions } from './confirmation';
import { Heading } from '@astryxdesign/core/Heading';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';

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
    const titleId = useId();
    const descriptionId = useId();
    const isSmallScreen = useMediaQuery('(max-width: 640px)');

    // Extend the sandbox backdrop for exactly the rendered modal's lifetime.
    useEffect(() => {
        activity?.(true, false);

        return () => activity?.(false, false);
    }, [activity]);

    // Preserve least-destructive initial focus and narrow-screen action order.
    const cancel = (
        <Button
            key="cancel"
            label={options.cancelLabel ?? 'Cancel'}
            variant="ghost"
            data-autofocus
            isDisabled={isPending}
            onClick={onCancel}
        />
    );

    const action = (
        <Button
            key="action"
            label={options.actionLabel}
            variant={options.actionVariant ?? 'primary'}
            isLoading={isPending}
            isDisabled={isPending}
            onClick={onAction}
        />
    );

    return (
        <Dialog
            isOpen
            role="alertdialog"
            purpose="form"
            width={400}
            maxHeight="calc(var(--view-viewport-height, 100dvh) - var(--spacing-10) * 2)"
            className="top-(--view-viewport-top) bottom-(--view-viewport-bottom)"
            aria-labelledby={titleId}
            aria-describedby={options.description ? descriptionId : undefined}
            aria-busy={isPending || undefined}
            onOpenChange={(open) => {
                if (!open) onCancel();
            }}
        >
            <Layout
                content={
                    <LayoutContent>
                        <Heading level={2} id={titleId}>
                            {options.title}
                        </Heading>
                        {options.description && (
                            <Text color="secondary" id={descriptionId}>
                                {options.description}
                            </Text>
                        )}
                        {error && <Banner role="alert" status="error" title={error} />}
                    </LayoutContent>
                }
                footer={
                    <LayoutFooter>
                        <Stack
                            direction={isSmallScreen ? 'vertical' : 'horizontal'}
                            gap={2}
                            align={isSmallScreen ? 'stretch' : undefined}
                            justify="end"
                            wrap={isSmallScreen ? 'nowrap' : 'wrap'}
                        >
                            {isSmallScreen ? [action, cancel] : [cancel, action]}
                        </Stack>
                    </LayoutFooter>
                }
            />
        </Dialog>
    );
}
