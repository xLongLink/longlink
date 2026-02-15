import { Button as UIButton } from '@/components/ui/button';
import type { ComponentProps } from 'react';
import {
    type DialogElement,
    isDialogElement,
} from '@/components/viavai/Dialog';
import { isObject } from '@/lib/utils';

export type ButtonVariant =
    | 'default'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'destructive'
    | 'link';

export type ButtonElement = {
    type: 'button';
    text: string;
    variant?: ButtonVariant;
    dialog?: DialogElement;
};

type ButtonProps = {
    text: string;
    variant?: ButtonVariant;
} & Omit<ComponentProps<typeof UIButton>, 'children' | 'variant'>;

const buttonVariants: ButtonVariant[] = [
    'default',
    'outline',
    'secondary',
    'ghost',
    'destructive',
    'link',
];

export function isButton(element: unknown): element is ButtonElement {
    if (!isObject(element)) {
        return false;
    }

    if (element.type !== 'button' || typeof element.text !== 'string') {
        return false;
    }

    if (
        element.variant !== undefined &&
        !buttonVariants.includes(element.variant as ButtonVariant)
    ) {
        return false;
    }

    if (element.dialog === undefined) {
        return true;
    }

    return isDialogElement(element.dialog);
}

export function Button({ text, variant = 'default', ...props }: ButtonProps) {
    return (
        <UIButton variant={variant} {...props}>
            {text}
        </UIButton>
    );
}

export default Button;
