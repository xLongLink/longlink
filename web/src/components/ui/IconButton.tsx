import type { MouseEvent } from 'react';
import { Icon, type StoneIconName } from './Icon';
import { useSize } from '@astryxdesign/core/SizeContext';
import { IconButton as AstryxIconButton } from '@astryxdesign/core/IconButton';

/** Runs a labeled icon action with automatic async feedback. */
export function IconButton({
    onClick,
    ...props
}: {
    /** Hides the component without unmounting it. */
    hidden?: boolean;
    label: string;
    icon: StoneIconName;
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
            className={props.hidden ? 'hidden!' : undefined}
            tooltip={props.hidden ? undefined : props.tooltip}
            icon={<Icon icon={props.icon} size={size} />}
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
