import type { MouseEvent, ReactNode } from 'react';
import { IconButton as AstryxIconButton } from '@astryxdesign/core/IconButton';

/** Runs a labeled icon action with automatic async feedback. */
export function IconButton({
    onClick,
    ...props
}: {
    label: string;
    icon: ReactNode;
    variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
    size?: 'sm' | 'md' | 'lg';
    tooltip?: string;
    isDisabled?: boolean;
    onClick?: (event: MouseEvent<HTMLButtonElement>) => void | Promise<void>;
}) {
    return (
        <AstryxIconButton
            {...props}
            onClick={undefined}
            clickAction={onClick}
            elevation="none"
            isLoading={false}
            isInterruptible={false}
        />
    );
}
