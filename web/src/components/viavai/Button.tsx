import {
    type ComponentProps,
    type ReactNode,
    type ReactElement,
    Children,
    isValidElement,
} from 'react';

import ViaVaiDialog from '@/components/viavai/Dialog';
import { Button as UIButton } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogTrigger,
} from '@/components/ui/dialog';

type ButtonProps = {
    text: string;
    variant?: ComponentProps<typeof UIButton>['variant'];
    children?: ReactNode;
};

function isViaVaiDialogChild(
    child: ReactNode
): child is ReactElement<ComponentProps<typeof ViaVaiDialog>> {
    return isValidElement(child) && child.type === ViaVaiDialog;
}

export function Button({ text, variant = 'default', children }: ButtonProps) {
    const trigger = (
        <UIButton variant={variant} className="cursor-pointer">
            {text}
        </UIButton>
    );

    if (!children) {
        return trigger;
    }

    const childList = Children.toArray(children);
    const dialogChild = childList.find(isViaVaiDialogChild);

    if (dialogChild) {
        const {
            confirm = 'Confirm',
            cancel = 'Cancel',
            children: dialogBody,
        } = dialogChild.props;

        return (
            <Dialog>
                <DialogTrigger render={trigger} />
                <DialogContent className="min-w-[40rem] max-w-5xl">
                    <div className="max-h-[70vh] overflow-y-auto p-1">
                        {dialogBody}
                    </div>
                    <DialogFooter>
                        <DialogClose
                            render={
                                <UIButton
                                    variant="outline"
                                    className="cursor-pointer"
                                />
                            }
                        >
                            {cancel}
                        </DialogClose>
                        <DialogClose
                            render={<UIButton className="cursor-pointer" />}
                        >
                            {confirm}
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog>
            <DialogTrigger render={trigger} />
            <DialogContent>{children}</DialogContent>
        </Dialog>
    );
}

export default Button;
