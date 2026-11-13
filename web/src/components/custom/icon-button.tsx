import { ControlSizeContext } from './contexts';
import { ActionControl } from './action-control';
import { Icon, type StoneIconName } from './icon';
import { useContext, type ComponentProps } from 'react';

/** Runs a labeled icon action with automatic async feedback. */
export function IconButton({
    onClick,
    ...props
}: {
    label: string;
    icon: StoneIconName;
    variant?: ComponentProps<typeof ActionControl>['variant'];
    size?: 'xs' | 'sm' | 'default' | 'lg';
    isDisabled?: boolean;
    onClick?: ComponentProps<typeof ActionControl>['onClick'];
}) {
    const inheritedSize = useContext(ControlSizeContext);
    const size = props.size ?? (inheritedSize === 'md' ? 'default' : inheritedSize) ?? 'default';

    // Match ordinary action button defaults without changing asynchronous behavior.
    return (
        <ActionControl
            aria-label={props.label}
            variant={props.variant}
            size={size === 'default' ? 'icon' : `icon-${size}`}
            disabled={props.isDisabled}
            onClick={onClick}
        >
            <Icon icon={props.icon} size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md'} />
        </ActionControl>
    );
}
