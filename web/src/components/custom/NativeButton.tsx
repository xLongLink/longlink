import { cn } from 'cn';
import { ApiError } from '@/lib/api';
import { LoaderCircle } from 'lucide-react';
import { ReportedError } from '@/lib/reported';
import { isCanceledRequest } from '@/lib/errors';
import { Button } from '@/components/shadcn/button';
import { NativeNavigationLink } from '../ui/NativeLink';
import { useRef, useState, type ComponentPropsWithRef, type MouseEvent, type ReactNode } from 'react';

/** Runs trusted native actions with recoverable failure feedback and immediate duplicate-click protection. */
export function NativeButton({
    label,
    icon,
    endContent,
    variant = 'outline',
    size = 'default',
    type = 'button',
    isDisabled = false,
    isLoading = false,
    onClick,
    clickAction,
    href,
    target,
    rel,
    download,
    width,
    className,
    ...props
}: Omit<ComponentPropsWithRef<'button'>, 'onClick'> & {
    label: string;
    icon?: ReactNode;
    endContent?: ReactNode;
    variant?: ComponentPropsWithRef<typeof Button>['variant'];
    size?: ComponentPropsWithRef<typeof Button>['size'];
    isDisabled?: boolean;
    isLoading?: boolean;
    href?: string;
    target?: string;
    rel?: string;
    download?: string | boolean;
    width?: number | string;
    onClick?: (event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
    clickAction?: (event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void | Promise<void>;
}) {
    const inFlight = useRef(false);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState('');
    const busy = isLoading || pending;
    const blocked = isDisabled || props.disabled || busy;
    const isLink = href !== undefined && !blocked;

    /** Keep the synchronous part of the action before the native submit default. */
    async function activate(event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) {
        if (blocked || inFlight.current) {
            event.preventDefault();
            event.stopPropagation();

            return;
        }

        if (!onClick && !clickAction) return;
        setError('');

        try {
            onClick?.(event);

            if (!clickAction || event.defaultPrevented) return;

            inFlight.current = true;
            setPending(true);
            await clickAction(event);
        } catch (cause) {
            if (!(cause instanceof ReportedError) && !isCanceledRequest(cause)) {
                setError(
                    cause instanceof ApiError ? cause.message : 'The action could not be completed. Please try again.'
                );
            }
        } finally {
            inFlight.current = false;
            setPending(false);
        }
    }

    // Real anchors retain browser gestures; the same control owns action feedback and native submit semantics.
    return (
        <>
            <Button
                {...props}
                variant={variant}
                size={size}
                className={cn('relative', className)}
                style={{ ...props.style, width: width ?? props.style?.width }}
                nativeButton={!isLink}
                render={
                    isLink ? (
                        <NativeNavigationLink href={href} target={target} rel={rel} download={download} />
                    ) : undefined
                }
                type={isLink ? undefined : type}
                role={isLink ? 'link' : undefined}
                disabled={blocked}
                aria-label={busy ? label : props['aria-label']}
                aria-disabled={blocked || undefined}
                aria-busy={busy || undefined}
                onClick={(event) => {
                    void activate(event);
                }}
                onKeyDown={(event) => {
                    props.onKeyDown?.(event);

                    if (isLink && event.key === ' ') event.preventBaseUIHandler();
                }}
                onKeyUp={(event) => {
                    props.onKeyUp?.(event);

                    if (isLink && event.key === ' ') event.preventBaseUIHandler();
                }}
            >
                <span className="view-action-content" aria-hidden={busy || undefined}>
                    {icon && (
                        <span className="view-action-icon" data-size={size}>
                            {icon}
                        </span>
                    )}
                    <span className="view-action-label">{label}</span>
                    {endContent}
                </span>
                {busy && <LoaderCircle aria-hidden="true" className="view-action-spinner size-3.5" />}
                <span role="status" aria-live="polite" className="sr-only">
                    {busy ? 'Loading' : ''}
                </span>
            </Button>
            {error && <span role="alert">{error}</span>}
        </>
    );
}
