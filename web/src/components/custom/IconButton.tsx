import { ActionButton } from './ActionButton';
import { ControlSizeContext } from '../ui/contexts';
import { Icon, type StoneIconName } from '../ui/Icon';
import { useContext, type ComponentProps } from 'react';

/** Runs a labeled icon action with automatic async feedback. */
export function IconButton({
    onClick,
    ...props
}: {
    label: string;
    icon: StoneIconName;
    variant?: ComponentProps<typeof ActionButton>['variant'];
    size?: 'xs' | 'sm' | 'default' | 'lg';
    isDisabled?: boolean;
    onClick?: ComponentProps<typeof ActionButton>['onClick'];
}) {
    const inheritedSize = useContext(ControlSizeContext);
    const size = props.size ?? (inheritedSize === 'md' ? 'default' : inheritedSize) ?? 'default';

    // Match ordinary action button defaults without changing asynchronous behavior.
    return (
        <ActionButton
            aria-label={props.label}
            variant={props.variant}
            size={size === 'default' ? 'icon' : `icon-${size}`}
            disabled={props.isDisabled}
            onClick={onClick}
        >
            <Icon icon={props.icon} size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md'} />
        </ActionButton>
    );
}
