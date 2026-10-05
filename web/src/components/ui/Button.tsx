import type { MouseEvent, ReactNode } from 'react';
import { Button as AstryxButton } from '@astryxdesign/core/Button';

type ButtonProps = {
    label: string;
    variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
    size?: 'sm' | 'md' | 'lg';
    type?: 'button' | 'submit' | 'reset';
    name?: string;
    value?: string | number | readonly string[];
    form?: string;
    icon?: ReactNode;
    endContent?: ReactNode;
    tooltip?: string;
    width?: number | string;
    isDisabled?: boolean;
    href?: string;
    onClick?: (event: MouseEvent<HTMLButtonElement>) => void | Promise<void>;
};

/** Gives onClick automatic asynchronous loading and duplicate-click prevention. */
export function Button({ onClick, ...props }: ButtonProps) {
    // Standardize advanced behavior even when untyped JSX supplies unsupported props.
    return (
        <AstryxButton
            {...props}
            children={undefined}
            isIconOnly={false}
            target={undefined}
            rel={undefined}
            onClick={undefined}
            clickAction={onClick}
            elevation="none"
            isLoading={false}
            isInterruptible={false}
        />
    );
}
