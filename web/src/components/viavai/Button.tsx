import { Button as UIButton } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import type { ComponentProps } from 'react';

export type ButtonVariant =
    | 'default'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'destructive'
    | 'link';

type ButtonProps = {
    text: string;
    variant?: ButtonVariant;
    children?: ComponentProps<'div'>['children'];
} & Omit<ComponentProps<typeof UIButton>, 'variant'>;

export function Button({
    text,
    variant = 'default',
    children,
    ...props
}: ButtonProps) {
    const trigger = (
        <UIButton variant={variant} {...props}>
            {text}
        </UIButton>
    );

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
