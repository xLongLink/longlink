import { LoaderCircle } from 'lucide-react';
import { Toolbar } from '@base-ui/react/toolbar';
import { Icon, type StoneIconName } from './Icon';
import { Button as Control } from '@/components/shadcn/button';
import { ButtonGroupContext, ControlSizeContext } from './contexts';
import { useContext, useRef, useTransition, useSyncExternalStore, type MouseEvent, type ReactNode } from 'react';

/** Shares native action semantics and grouped control sizing. */
export function ActionButton({
    label,
    icon,
    iconOnly = false,
    variant = 'secondary',
    size: requestedSize,
    type = 'button',
    disabled = false,
    onClick,
    href,
    width,
    endContent,
    name,
    value,
    form,
}: {
    label: string;
    icon?: StoneIconName;
    iconOnly?: boolean;
    variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
    size?: 'sm' | 'md' | 'lg';
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    onClick?: (event: MouseEvent<HTMLButtonElement>) => void | Promise<void>;
    href?: string;
    width?: number | string;
    endContent?: ReactNode;
    name?: string;
    value?: string | number | readonly string[];
    form?: string;
}) {
    const inheritedSize = useContext(ControlSizeContext);
    const size = requestedSize ?? inheritedSize ?? 'md';
    const group = useContext(ButtonGroupContext);
    const blocked = disabled || (group?.isDisabled ?? false);
    const inFlight = useRef(false);
    const [pending, startTransition] = useTransition();
    const isLink = href !== undefined && !blocked;

    const client = useSyncExternalStore(
        () => () => {},
        () => true,
        () => false
    );

    const renderedType = blocked && !client && type !== 'button' ? 'button' : type;

    // The synchronous guard covers repeated events before React commits the pending state.
    function activate(event: MouseEvent<HTMLButtonElement>) {
        if (blocked || pending || inFlight.current) {
            event.preventDefault();
            event.stopPropagation();

            return;
        }

        if (!onClick) return;
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
            variant="view"
            data-variant={variant}
            data-size={size}
            data-icon-only={iconOnly || undefined}
            data-group-orientation={group?.orientation}
            data-group-action={group ? '' : undefined}
            nativeButton={!isLink}
            render={isLink ? <a href={href} /> : undefined}
            role={isLink ? 'link' : undefined}
            type={isLink ? undefined : renderedType}
            name={blocked || isLink ? undefined : name}
            value={value}
            form={isLink ? undefined : form}
            disabled={blocked}
            focusableWhenDisabled
            aria-label={iconOnly || pending ? label : undefined}
            aria-busy={pending || undefined}
            aria-disabled={blocked || pending || undefined}
            style={{ width }}
            onClickCapture={(event) => {
                if (blocked) {
                    event.preventDefault();
                    event.stopPropagation();
                }
            }}
            onClick={activate}
            onKeyDown={(event) => {
                if ((blocked || pending || inFlight.current) && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                }

                if (isLink && event.key === ' ') event.preventBaseUIHandler();
            }}
            onKeyUp={(event) => {
                if (isLink && event.key === ' ') event.preventBaseUIHandler();
            }}
        >
            <span className="view-action-content" aria-hidden={pending || undefined}>
                {icon && (
                    <span className="view-action-icon" data-size={size}>
                        <Icon icon={icon} size={size} />
                    </span>
                )}
                {!iconOnly && <span className="view-action-label">{label}</span>}
                {!iconOnly && endContent}
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
