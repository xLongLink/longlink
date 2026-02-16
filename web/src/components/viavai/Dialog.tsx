import { type ReactElement, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { DialogClose, DialogContent, DialogFooter } from '@/components/ui/dialog';


type DialogProps = {
    trigger: ReactElement;
    confirm?: string;
    cancel?: string;
    children?: ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
};


export function Dialog({ confirm = 'Confirm', cancel = 'Cancel', children }: DialogProps) {
    const cancelRender = <Button variant="outline" className="cursor-pointer" />
    const confirmRender = <Button className="cursor-pointer" />

    return (
        <>
            <DialogContent className="min-w-[40rem] max-w-5xl">
                <div className="max-h-[70vh] overflow-y-auto p-1">
                    {children}
                </div>
                <DialogFooter>
                    <DialogClose render={cancelRender}>
                        {cancel}
                    </DialogClose>
                    <DialogClose render={confirmRender}>
                        {confirm}
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </>
    );
}

export default Dialog
