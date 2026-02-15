import { type ReactElement, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogTrigger,
} from '@/components/ui/dialog';

type ViaVaiDialogProps = {
    trigger: ReactElement;
    confirm?: string;
    cancel?: string;
    children?: ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
};

export function ViaVaiDialog({
    trigger,
    confirm = 'Confirm',
    cancel = 'Cancel',
    children,
    open,
    onOpenChange,
}: ViaVaiDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger render={trigger} />
            <DialogContent className="min-w-[40rem] max-w-5xl">
                <div className="max-h-[70vh] overflow-y-auto p-1">
                    {children}
                </div>
                <DialogFooter>
                    <DialogClose
                        render={
                            <Button
                                variant="outline"
                                className="cursor-pointer"
                            />
                        }
                    >
                        {cancel}
                    </DialogClose>
                    <DialogClose render={<Button className="cursor-pointer" />}>
                        {confirm}
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default ViaVaiDialog;
