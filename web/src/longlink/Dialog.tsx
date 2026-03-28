import { type ReactElement, type ReactNode } from 'react';
import { Button } from '@/ui/button';
import { DialogClose, DialogContent, DialogFooter } from '@/ui/dialog';

type DialogProps = {
    trigger: ReactElement;
    confirm?: string;
    cancel?: string;
    children?: ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
};

/* 
    A Layout 

*/
export function Dialog({
    confirm = 'Confirm',
    cancel = 'Cancel',
    children,
}: DialogProps) {
    return (
        <DialogContent className="min-w-[40rem] max-w-5xl">
            <div className="max-h-[70vh] overflow-y-auto p-1">{children}</div>
            <DialogFooter>
                <DialogClose
                    render={
                        <Button variant="outline" className="cursor-pointer" />
                    }
                >
                    {cancel}
                </DialogClose>
                <DialogClose render={<Button className="cursor-pointer" />}>
                    {confirm}
                </DialogClose>
            </DialogFooter>
        </DialogContent>
    );
}

export default Dialog;
