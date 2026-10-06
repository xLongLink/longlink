import type { MouseEvent, ReactNode } from 'react';
import { useSize } from '@astryxdesign/core/SizeContext';
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
    // Preserve inherited control sizing before applying the medium fallback.
    const size = useSize(props.size, 'md');

    // Match ordinary action button defaults without changing asynchronous behavior.
    return (
        <AstryxIconButton
            {...props}
            variant={props.variant ?? 'secondary'}
            size={size}
            isDisabled={props.isDisabled ?? false}
            onClick={undefined}
            clickAction={onClick}
            elevation="none"
            isLoading={false}
            isInterruptible={false}
        />
    );
}
