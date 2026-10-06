import type { MouseEvent, ReactNode } from 'react';
import { useSize } from '@astryxdesign/core/SizeContext';
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
    // Preserve container sizing before falling back to the standard medium button.
    const size = useSize(props.size, 'md');

    // Standardize advanced behavior even when untyped JSX supplies unsupported props.
    return (
        <AstryxButton
            {...props}
            variant={props.variant ?? 'secondary'}
            size={size}
            type={props.type ?? 'button'}
            isDisabled={props.isDisabled ?? false}
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
