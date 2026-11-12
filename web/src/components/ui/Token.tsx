import { Icon, type StoneIconName } from './Icon';
import { Token as AstryxToken } from '@/components/astryx/Token';

/** Displays a tag, category, or selection with optional click and removal actions. */
export function Token(props: {
    /** Visible text and accessible name for the token. Long labels truncate to fit. */
    label: string;
    size?: 'sm' | 'md' | 'lg';
    icon?: StoneIconName;
    disabled?: boolean;
    /** Accessible description of the tag or selection. */
    description?: string;
    /** Runs when the token is clicked. Use Button or Link for primary actions or navigation. */
    onClick?: () => void;
    /** Shows a remove button and runs when it is clicked. */
    onRemove?: () => void;
}) {
    // Forward only the supported metadata and actions, without unrestricted links or styling.
    return (
        <AstryxToken
            label={props.label}
            size={props.size ?? 'md'}
            icon={props.icon ? <Icon icon={props.icon} size="sm" /> : undefined}
            isDisabled={props.disabled ?? false}
            description={props.description}
            onClick={props.onClick}
            onRemove={props.onRemove}
        />
    );
}
