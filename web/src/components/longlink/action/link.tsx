import { cn } from 'cn';
import { ArrowUpRight } from 'lucide-react';
import { ReportedError } from '@/lib/reported';
import { isCanceledRequest } from '@/lib/errors';
import { Spinner } from '@/components/shadcn/spinner';
import type { VariantProps } from 'class-variance-authority';
import { LinkNavigationContext } from '@/components/custom/contexts';
import { buttonVariants } from '@/components/longlink/action/button';
import { Link as RouterLink, useInRouterContext } from 'react-router';
import { resolveExternalUrl, resolveScopedNavigationUrl } from '@/lib/url';
import {
    useContext,
    useRef,
    useCallback,
    useTransition,
    type Ref,
    type RefCallback,
    type DOMAttributes,
    type MouseEvent,
    type AnchorHTMLAttributes,
    type ButtonHTMLAttributes
} from 'react';

type LinkElementProps<Props extends DOMAttributes<HTMLElement>, OtherProps> = Omit<
    Props,
    'href' | 'download' | 'onClick' | 'type' | 'className' | 'style'
> & { onClick?: (...args: Parameters<NonNullable<Props['onClick']>>) => unknown } & {
    [Key in Exclude<keyof OtherProps, keyof Props | 'href' | 'download' | 'disabled'>]?: never;
};

type NavigationProps = LinkElementProps<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    ButtonHTMLAttributes<HTMLButtonElement>
> & { href: string; download?: string | boolean; disabled?: boolean; isExternalLink?: boolean };

type ButtonLinkProps = LinkElementProps<
    ButtonHTMLAttributes<HTMLButtonElement>,
    AnchorHTMLAttributes<HTMLAnchorElement>
>;

type CallbackProps = ButtonLinkProps &
    Required<Pick<ButtonLinkProps, 'onClick'>> & { href?: never; download?: never; isExternalLink?: never };

type ActionLinkProps = CallbackProps & { ref?: RefCallback<HTMLElement> };

type LinkProps = (NavigationProps | CallbackProps) &
    VariantProps<typeof buttonVariants> & { ref?: Ref<HTMLElement>; fullWidth?: boolean };

/** Renders navigation as an anchor and callback actions as link-styled buttons. */
export function Link(props: LinkProps) {
    const navigationContext = useContext(LinkNavigationContext);
    const router = useInRouterContext();
    const {
        variant = 'link',
        size = variant === 'link' ? null : 'default',
        ref,
        fullWidth,
        isExternalLink = false,
        ...link
    } = props;
    const elementRef = useCallback(
        (element: HTMLElement | null) => {
            if (typeof ref === 'function') return ref(element);
            if (ref) ref.current = element;
        },
        [ref]
    );
    const className = cn(
        buttonVariants({ variant, size }),
        'align-baseline whitespace-normal aria-disabled:pointer-events-none aria-disabled:opacity-50',
        fullWidth && 'w-full'
    );

    if (link.href === undefined) {
        return <ActionLink {...link} ref={elementRef} className={className} />;
    }

    const { disabled, onClick, children, href: suppliedHref, target: suppliedTarget, rel, download, ...anchor } = link;
    const href = disabled ? undefined : suppliedHref;
    const target = isExternalLink ? '_blank' : suppliedTarget;
    const external = href !== undefined && /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href.trim());
    const internalHref = navigationContext && href ? resolveScopedNavigationUrl(navigationContext.baseUrl, href) : '';
    let destination = navigationContext ? internalHref || undefined : href;

    if (navigationContext && href && !internalHref) destination = resolveExternalUrl(document.baseURI, href);

    const anchorProps = {
        ...anchor,
        ref: elementRef,
        style: undefined,
        target: navigationContext && !internalHref ? '_blank' : target,
        rel:
            navigationContext || target === '_blank'
                ? [...new Set(`${rel ?? ''} noopener noreferrer`.trim().split(/\s+/))].join(' ')
                : rel,
        'aria-disabled': disabled || undefined,
        tabIndex: disabled ? 0 : anchor.tabIndex,
        className,
        onClick: (event: MouseEvent<HTMLAnchorElement>) => {
            if (disabled) {
                event.preventDefault();
                event.stopPropagation();

                return;
            }

            onClick?.(event);

            if (event.defaultPrevented) return;

            if (!destination) {
                event.preventDefault();

                return;
            }

            if (
                navigationContext &&
                href &&
                internalHref &&
                download === undefined &&
                (!target || target === '_self') &&
                event.button === 0 &&
                !event.altKey &&
                !event.ctrlKey &&
                !event.metaKey &&
                !event.shiftKey
            ) {
                event.preventDefault();
                navigationContext.navigate(href);
            }
        },
        children: (
            <>
                {children}
                {isExternalLink && <ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0" />}
                {isExternalLink && <span className="sr-only">(opens in new tab)</span>}
            </>
        )
    };

    if (!navigationContext && router && href !== undefined && !external && download === undefined) {
        return <RouterLink {...anchorProps} to={href} />;
    }

    return <a {...anchorProps} href={destination} download={download} />;
}

/** Owns async action state without changing the button or its focus during pending work. */
function ActionLink({
    disabled = false,
    onClick,
    onKeyDown,
    children,
    className,
    ...props
}: ActionLinkProps & { className: string }) {
    const actionInFlight = useRef(false);
    const [isPending, startTransition] = useTransition();
    const blocked = disabled || isPending;

    // Prevent duplicate actions before React commits the pending state.
    function activate(event: MouseEvent<HTMLButtonElement>) {
        if (blocked || actionInFlight.current) {
            event.preventDefault();
            event.stopPropagation();

            return;
        }

        actionInFlight.current = true;

        let result: unknown;

        try {
            result = onClick?.(event);
        } catch (error) {
            result = Promise.reject(error);
        }

        event.preventDefault();

        startTransition(async () => {
            try {
                await result;
            } catch (error) {
                if (!(error instanceof ReportedError) && !isCanceledRequest(error)) throw error;
            } finally {
                actionInFlight.current = false;
            }
        });
    }

    return (
        <button
            {...props}
            type="button"
            style={undefined}
            aria-disabled={blocked || undefined}
            aria-busy={isPending || undefined}
            onClick={activate}
            onKeyDown={(event) => {
                if (blocked && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();

                    return;
                }

                onKeyDown?.(event);
            }}
            className={cn(className, 'gap-1.5')}
        >
            {isPending && (
                <span role="status" aria-label="Loading" className="inline-flex align-middle">
                    <Spinner aria-hidden="true" className="motion-reduce:animate-none" />
                </span>
            )}
            {children}
        </button>
    );
}
