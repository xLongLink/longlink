import { cn } from 'cn';
import { X } from 'lucide-react';
import type { ComponentProps } from 'react';
import { Badge } from '@/components/reui/badge';
import { Icon, type StoneIconName } from './icon';
import { Button } from '@/components/shadcn/button';

/** Displays a tag, category, or selection with optional click and removal actions. */
export function Token({
    size = 'lg',
    ...props
}: {
    /** Visible text and accessible name for the token. Long labels truncate to fit. */
    label: string;
    size?: ComponentProps<typeof Badge>['size'];
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
        <Badge
            variant="secondary"
            size={size}
            className={cn(
                'view-token max-w-full transition-colors has-[>.view-token-action:focus-visible]:ring-2 has-[>.view-token-action:focus-visible]:ring-ring has-[>.view-token-action:focus-visible]:ring-offset-1 has-[>.view-token-action:focus-visible]:ring-offset-background',
                props.disabled && 'opacity-50',
                props.onClick && !props.disabled && 'hover:bg-secondary/80'
            )}
            data-disabled={props.disabled || undefined}
            aria-description={props.onClick ? undefined : props.description}
        >
            {props.icon && <Icon icon={props.icon} size="sm" />}
            {props.onClick ? (
                <button
                    type="button"
                    className={cn(
                        'view-token-action min-w-0 truncate border-0 bg-transparent p-0 font-[inherit] text-inherit outline-none after:absolute after:inset-0',
                        props.disabled ? 'cursor-default' : 'cursor-pointer'
                    )}
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
                    <span className="block truncate [unicode-bidi:isolate]" dir={labelDirection}>
                        {props.label}
                    </span>
                </button>
            ) : (
                <span className="min-w-0 truncate [unicode-bidi:isolate]" dir={labelDirection}>
                    {props.label}
                </span>
            )}
            {props.onRemove && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                        'relative z-1 size-4 shrink-0 before:absolute before:-inset-1 hover:bg-transparent',
                        props.disabled ? 'cursor-default' : 'cursor-pointer'
                    )}
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
                    <X className="size-3" aria-hidden="true" />
                </Button>
            )}
        </Badge>
    );
}
