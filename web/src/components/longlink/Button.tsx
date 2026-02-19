import { useState, type ComponentProps, type ReactNode } from 'react';
import { Button as UIButton } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

type ButtonProps = {
    text: string;
    variant?: ComponentProps<typeof UIButton>['variant'];
    children?: ReactNode;
};

export function Button({ text, variant = 'default', children }: ButtonProps) {
    const [open, setOpen] = useState(false);
    const hasDialog = Boolean(children);

    return (
        <>
            <UIButton
                variant={variant}
                onClick={() => {
                    if (hasDialog) setOpen(true);
                }}
                className="cursor-pointer"
            >
                {text}
            </UIButton>

            {hasDialog && (
                <Dialog open={open} onOpenChange={setOpen}>
                    {children}
                </Dialog>
            )}
        </>
    );
}

export default Button;
