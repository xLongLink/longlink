import { X } from 'lucide-react';
import { Icon, type StoneIconName } from './Icon';

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
    // Keep mixed-direction labels in the surrounding direction, and isolate neutral or Latin-only labels.
    const labelDirection =
        /[\p{Script=Adlam}\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Mandaic}\p{Script=Nko}\p{Script=Samaritan}\p{Script=Syriac}\p{Script=Thaana}\u200F\u061C\u{10800}-\u{10FFF}\u{1E800}-\u{1EFFF}]/u.test(
            props.label
        )
            ? undefined
            : 'ltr';

    // Sibling native buttons keep activation and removal independent, including inside forms.
    return (
        <span
            className="view-token"
            data-size={props.size ?? 'md'}
            data-disabled={props.disabled || undefined}
            data-interactive={props.onClick ? true : undefined}
            aria-description={props.onClick ? undefined : props.description}
        >
            {props.icon && <Icon icon={props.icon} size="sm" />}
            {props.onClick ? (
                <button
                    type="button"
                    className="view-token-action"
                    aria-description={props.description}
                    aria-disabled={props.disabled || undefined}
                    onClick={(event) => {
                        // Disabled tokens stay focusable without activating enclosing controls.
                        if (props.disabled) {
                            event.preventDefault();
                            event.stopPropagation();

                            return;
                        }

                        props.onClick?.();
                    }}
                    onKeyDown={(event) => {
                        if (props.disabled && (event.key === 'Enter' || event.key === ' ')) event.preventDefault();
                    }}
                >
                    <span className="view-token-label" dir={labelDirection}>
                        {props.label}
                    </span>
                </button>
            ) : (
                <span className="view-token-label" dir={labelDirection}>
                    {props.label}
                </span>
            )}
            {props.onRemove && (
                <button
                    type="button"
                    className="view-token-remove"
                    aria-label={`Remove ${props.label}`}
                    aria-disabled={props.disabled || undefined}
                    onClick={(event) => {
                        // Removal never triggers the token action or an enclosing clickable surface.
                        event.stopPropagation();

                        if (props.disabled) {
                            event.preventDefault();

                            return;
                        }

                        props.onRemove?.();
                    }}
                    onKeyDown={(event) => {
                        if (props.disabled && (event.key === 'Enter' || event.key === ' ')) event.preventDefault();
                    }}
                >
                    <X aria-hidden="true" />
                </button>
            )}
        </span>
    );
}
