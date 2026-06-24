import { type ReactNode } from 'react';

import { Button } from '@ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@ui/dialog';

type DeleteConfirmationDialogProps = {
    open: boolean;
    title: string;
    description: ReactNode;
    error?: string | null;
    isPending: boolean;
    onConfirm: () => void;
    onOpenChange: (open: boolean) => void;
};

/** Renders a shared destructive confirmation dialog. */
export function DeleteConfirmationDialog({
    open,
    title,
    description,
    error,
    isPending,
    onConfirm,
    onOpenChange,
}: DeleteConfirmationDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <div className="space-y-4">
                    <div className="space-y-1">
                        <DialogTitle>{title}</DialogTitle>
                        <DialogDescription>{description}</DialogDescription>
                    </div>

                    {error ? <p className="text-sm text-destructive">{error}</p> : null}

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                onOpenChange(false);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button type="button" variant="destructive" disabled={isPending} onClick={onConfirm}>
                            {isPending ? 'Deleting...' : 'Delete'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
