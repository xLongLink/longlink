import { Button as UIButton, buttonVariants } from '@/ui/button';
import { cn } from '@/lib/utils';
import type { AnchorHTMLAttributes } from 'react';
import { Link } from 'react-router';

import type { ActionComponentProps } from '../types';

type XMLButtonProps = Omit<Parameters<typeof UIButton>[0], keyof ActionComponentProps> &
    Partial<ActionComponentProps> & {
        href?: string;
        _baseUrl?: string;
    };

/**
 * XML button adapter that maps action-layer props to DOM-safe button props.
 */
function Button({
    action,
    pending = false,
    href,
    _baseUrl: _unusedBaseUrl,
    onClick,
    disabled,
    className,
    variant,
    size,
    children,
    ...props
}: XMLButtonProps) {
    const handleClick = (event: Parameters<NonNullable<typeof onClick>>[0]) => {
        onClick?.(event);

        if (!event.defaultPrevented) {
            void action?.(event as any);
        }
    };

    /* Render link buttons as anchors so navigation does not go through the action request pipeline. */
    if (href) {
        /* Keep internal XML links inside the React Router app instead of triggering a full page load. */
        if (href.startsWith('/')) {
            return (
                <Link
                    {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}
                    to={href}
                    className={cn(buttonVariants({ variant, size }), className)}
                    aria-disabled={Boolean(disabled) || pending}
                >
                    {children}
                </Link>
            );
        }

        return (
            <a
                {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}
                href={href}
                className={cn(buttonVariants({ variant, size }), className)}
                aria-disabled={Boolean(disabled) || pending}
            >
                {children}
            </a>
        );
    }

    return (
        <UIButton
            {...props}
            className={className}
            variant={variant}
            size={size}
            onClick={handleClick}
            disabled={Boolean(disabled) || pending}
        >
            {children}
        </UIButton>
    );
}

export { Button };
export default Button;
