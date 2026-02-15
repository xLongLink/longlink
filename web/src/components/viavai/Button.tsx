import { Button as UIButton } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import type { ComponentProps } from 'react';

export type ButtonVariant = NonNullable<
    ComponentProps<typeof UIButton>['variant']
>;

type ButtonProps = {
    text: string;
    variant?: ButtonVariant;
    size?: ComponentProps<typeof UIButton>['size'];
    className?: ComponentProps<typeof UIButton>['className'];
    disabled?: ComponentProps<typeof UIButton>['disabled'];
    onClick?: ComponentProps<typeof UIButton>['onClick'];
    type?: ComponentProps<typeof UIButton>['type'];
    children?: ComponentProps<'div'>['children'];
};

export function Button({
    text,
    variant = 'default',
    size = 'default',
    className,
    disabled,
    onClick,
    type,
    children,
}: ButtonProps) {
    const trigger = (
        <UIButton
            variant={variant}
            size={size}
            className={className}
            disabled={disabled}
            onClick={onClick}
            type={type}
        >
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
