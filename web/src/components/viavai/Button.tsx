import { Button as UIButton } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import type { ComponentProps } from 'react';

type ButtonProps = {
    text: string;
    variant?: NonNullable<ComponentProps<typeof UIButton>['variant']>;
    children?: ComponentProps<'div'>['children'];
};

export function Button({ text, variant = 'default', children }: ButtonProps) {
    const trigger = <UIButton variant={variant}>{text}</UIButton>;

    if (!children) {
        return trigger;
    }

    return (
        <Dialog>
            <DialogTrigger render={trigger} />
            <DialogContent>{children}</DialogContent>
        </Dialog>
    );
}

export default Button;
