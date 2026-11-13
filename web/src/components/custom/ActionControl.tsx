import { cn } from 'cn';
import { LoaderCircle } from 'lucide-react';
import { Toolbar } from '@base-ui/react/toolbar';
import { Button as Control } from '@/components/shadcn/button';
import { ButtonGroupContext, ControlSizeContext } from './contexts';
import { useContext, useRef, useState, useTransition, useSyncExternalStore, type ComponentProps } from 'react';

type ActionClickEvent = Parameters<NonNullable<ComponentProps<typeof Control>['onClick']>>[0];

/** Preserves shadcn composition while awaiting onClick, showing progress, and blocking duplicate activations. */
export function ActionControl({
    children,
    variant = 'default',
    size: requestedSize,
    type = 'button',
    disabled = false,
    onClick,
    href,
    name,
    value,
    form,
    className,
    onClickCapture,
    onKeyDown,
    onKeyUp,
    ...props
}: Omit<ComponentProps<typeof Control>, 'onClick'> & {
    /** Awaited with loading feedback; repeated activation is blocked until the action settles. */
    onClick?: (event: ActionClickEvent) => void | Promise<void>;
    /** Solution-relative destination in Views, or a native link outside the scoped host. */
    href?: string;
}) {
    const inheritedSize = useContext(ControlSizeContext);
    const size = requestedSize ?? (inheritedSize === 'md' ? 'default' : inheritedSize) ?? 'default';
    const group = useContext(ButtonGroupContext);
    const blocked = disabled || (group?.isDisabled ?? false);
    const inFlight = useRef(false);
    const [loadingLabel, setLoadingLabel] = useState('');
    const [pending, startTransition] = useTransition();
    const isLink = href !== undefined && !blocked;

    const client = useSyncExternalStore(
        () => () => {},
        () => true,
        () => false
    );

    const renderedType = blocked && !client && type !== 'button' ? 'button' : type;

    // The synchronous guard covers repeated events before React commits the pending state.
    function activate(event: ActionClickEvent) {
        if (blocked || pending || inFlight.current) {
            event.preventDefault();
            event.stopPropagation();

            return;
        }

        if (!onClick) return;
        setLoadingLabel(event.currentTarget.textContent ?? '');
        inFlight.current = true;
        startTransition(async () => {
            try {
                await onClick(event);
            } finally {
                inFlight.current = false;
            }
        });
    }

    const control = (
        <Control
            {...props}
            variant={variant}
            size={size}
            className={cn('relative min-w-0', className)}
            data-variant={variant}
            data-size={size}
            data-group-action={group ? '' : undefined}
            nativeButton={isLink ? false : props.nativeButton}
            render={isLink ? <a href={href} /> : props.render}
            role={isLink ? 'link' : props.role}
            type={isLink ? undefined : renderedType}
            name={blocked || isLink ? undefined : name}
            value={value}
            form={isLink ? undefined : form}
            disabled={blocked}
            focusableWhenDisabled={props.focusableWhenDisabled ?? true}
            aria-label={props['aria-label'] ?? (pending ? loadingLabel : undefined)}
            aria-busy={pending || props['aria-busy']}
            aria-disabled={blocked || pending || props['aria-disabled']}
            onClickCapture={(event) => {
                if (blocked) {
                    event.preventDefault();
                    event.stopPropagation();

                    return;
                }

                onClickCapture?.(event);
            }}
            onClick={activate}
            onKeyDown={(event) => {
                onKeyDown?.(event);

                if ((blocked || pending || inFlight.current) && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                }

                if (isLink && event.key === ' ') event.preventBaseUIHandler();
            }}
            onKeyUp={(event) => {
                onKeyUp?.(event);

                if (isLink && event.key === ' ') event.preventBaseUIHandler();
            }}
        >
            <span className="view-action-content" aria-hidden={pending || undefined}>
                {children}
            </span>
            {pending && <LoaderCircle aria-hidden="true" className="view-action-spinner" />}
            <span role="status" aria-live="polite" className="sr-only">
                {pending ? 'Loading' : ''}
            </span>
        </Control>
    );

    if (!group) return control;

    return isLink ? (
        <Toolbar.Link render={control} />
    ) : (
        <Toolbar.Button
            render={control}
            disabled={blocked}
            focusableWhenDisabled={group.isDisabled}
            nativeButton={!isLink}
        />
    );
}
