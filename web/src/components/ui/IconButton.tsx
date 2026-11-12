import type { MouseEvent } from 'react';
import type { StoneIconName } from './Icon';
import { ActionButton } from './ActionButton';

/** Runs a labeled icon action with automatic async feedback. */
export function IconButton({
    onClick,
    ...props
}: {
    label: string;
    icon: StoneIconName;
    variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
    size?: 'sm' | 'md' | 'lg';
    isDisabled?: boolean;
    onClick?: (event: MouseEvent<HTMLButtonElement>) => void | Promise<void>;
}) {
    // Match ordinary action button defaults without changing asynchronous behavior.
    return (
        <ActionButton
            label={props.label}
            icon={props.icon}
            variant={props.variant}
            size={props.size}
            disabled={props.isDisabled}
            onClick={onClick}
            iconOnly
        />
    );
}
