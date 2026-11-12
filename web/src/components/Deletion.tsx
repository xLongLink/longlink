import { Text } from '@/components/astryx/Text';
import { Stack } from '@/components/astryx/Stack';
import { Button } from '@/components/astryx/Button';
import { useId, useRef, useTransition } from 'react';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { Dialog, DialogHeader } from '@/components/astryx/Dialog';
import { Layout, LayoutContent, LayoutFooter } from '@/components/astryx/Layout';

/** Tracks deletion for its mounted lifetime; callers own the resource, mounting, and success-only closure. */
export function DeletionDialog({
    confirmation,
    onClose,
}: {
    confirmation: { title: string; description: string; onDelete: () => Promise<void> } | null;
    onClose: () => void;
}) {
    // Preserve pending state across dismissal for callers that keep this component mounted.
    const [isDeleting, startDeletion] = useTransition();
    const deletionInFlight = useRef(false);
    const descriptionId = useId();
    const isSmallScreen = useMediaQuery('(max-width: 640px)');

    if (!confirmation) return null;

    // Keep the least-destructive focus target and narrow-screen action order unchanged.
    const cancelButton = <Button key="cancel" label="Cancel" variant="ghost" data-autofocus onClick={onClose} />;

    const deleteButton = (
        <Button
            key="delete"
            label="Delete"
            variant="destructive"
            isLoading={isDeleting}
            onClick={() => {
                // Deduplicate same-tick clicks before the transition's pending state renders.
                if (deletionInFlight.current) return;

                deletionInFlight.current = true;
                startDeletion(async () => {
                    // Release the guard without swallowing transition errors.
                    try {
                        await confirmation.onDelete();
                    } finally {
                        deletionInFlight.current = false;
                    }
                });
            }}
        />
    );

    // Preserve alert semantics and cancellation focus while adding explicit header dismissal.
    return (
        <Dialog
            isOpen
            purpose="form"
            role="alertdialog"
            aria-describedby={descriptionId}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <Layout
                header={<DialogHeader title={confirmation.title} onOpenChange={onClose} />}
                content={
                    <LayoutContent>
                        <Text color="secondary" id={descriptionId}>
                            {confirmation.description}
                        </Text>
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
                            {isSmallScreen ? [deleteButton, cancelButton] : [cancelButton, deleteButton]}
                        </Stack>
                    </LayoutFooter>
                }
            />
        </Dialog>
    );
}
