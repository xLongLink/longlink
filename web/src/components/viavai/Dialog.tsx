import { type ReactElement, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogTrigger,
} from '@/components/ui/dialog';
import { isObject } from '@/lib/utils';

export type DialogElement = {
    type: 'dialog';
    confirm?: string;
    cancel?: string;
    components: unknown[];
};

type ViaVaiDialogProps = {
    trigger: ReactElement;
    confirm?: string;
    cancel?: string;
    children?: ReactNode;
};

export function isDialogElement(element: unknown): element is DialogElement {
    if (!isObject(element)) {
        return false;
    }

    return element.type === 'dialog' && Array.isArray(element.components);
}

export function ViaVaiDialog({
    trigger,
    confirm = 'Confirm',
    cancel = 'Cancel',
    children,
}: ViaVaiDialogProps) {
    return (
        <Dialog>
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
