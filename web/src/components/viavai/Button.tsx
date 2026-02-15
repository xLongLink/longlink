import { Button as UIButton } from '@/components/ui/button';
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
} & Omit<ComponentProps<typeof UIButton>, 'children' | 'variant'>;

export function Button({ text, variant = 'default', ...props }: ButtonProps) {
    return (
        <UIButton variant={variant} {...props}>
            {text}
        </UIButton>
    );
}

export default Button;
