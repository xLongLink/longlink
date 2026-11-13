import { cn } from 'cn';
import { Text } from './Text';
import { useDownload } from './preview';
import { ReportedError } from '@/lib/reported';
import { resolveNavigationUrl } from '@/lib/url';
import { LinkNavigationContext } from './contexts';
import { Spinner } from '@/components/shadcn/spinner';
import { buttonVariants } from '@/components/shadcn/button';
import { useContext, useRef, useTransition, type ComponentPropsWithRef, type MouseEvent, type ReactNode } from 'react';

/** Preserves native link gestures while routing ordinary internal clicks through the host. */
export function NavigationLink({ href, target, onClick, ...props }: ComponentPropsWithRef<'a'>) {
    const navigation = useContext(LinkNavigationContext);
    const internalHref = navigation && href ? resolveNavigationUrl(navigation.baseUrl, href) : '';
    let destination = navigation ? internalHref || undefined : href;

    // Native external navigation accepts only the same HTTP(S) destinations as the host bridge.
    if (
        navigation &&
        href &&
        !internalHref &&
        (URL.canParse(href.trim()) || href.trim().startsWith('//')) &&
        URL.canParse(href.trim(), document.baseURI)
    ) {
        const url = new URL(href.trim(), document.baseURI);

        if ((url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password) {
            destination = url.href;
        }
    }

    // External destinations leave the frame; internal modifier-clicks retain browser defaults.
    return (
        <a
            {...props}
            href={destination}
            target={navigation && !internalHref ? '_blank' : target}
            rel="noopener noreferrer"
            onClick={(event) => {
                onClick?.(event);

                if (event.defaultPrevented) return;

                if (!destination) {
                    event.preventDefault();

                    return;
                }

                if (
                    navigation &&
                    href &&
                    internalHref &&
                    (!target || target === '_self') &&
                    event.button === 0 &&
                    !event.altKey &&
                    !event.ctrlKey &&
                    !event.metaKey &&
                    !event.shiftKey
                ) {
                    event.preventDefault();
                    navigation.navigate(href);
                }
            }}
        />
    );
}

/** Navigates, downloads an attachment, or runs a link-styled button action. */
export function Link({
    to,
    download,
    disabled = false,
    onClick,
    children
}: {
    to?: string;
    download?: string;
    disabled?: boolean;
    /** Runs an action with automatic async loading and duplicate-click prevention. Omit to for button semantics. */
    onClick?: (event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void | Promise<void>;
    children?: ReactNode;
}) {
    const attachment = useDownload();
    const actionInFlight = useRef(false);
    const [isPending, startTransition] = useTransition();
    const blocked = disabled || isPending;

    // Keep synchronous state updates urgent; only a returned promise enters a transition.
    function activate(event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) {
        if (blocked || actionInFlight.current) {
            event.preventDefault();
            event.stopPropagation();

            return;
        }

        // Download links use the scoped host capability instead of native navigation.
        if (download !== undefined && to !== undefined) event.preventDefault();

        if (!onClick && download === undefined) return;
        actionInFlight.current = true;

        try {
            const result = onClick?.(event);

            if (!result && (download === undefined || to === undefined)) {
                actionInFlight.current = false;

                return;
            }

            startTransition(async () => {
                try {
                    await result;

                    if (download !== undefined && to !== undefined) await attachment.download(to, download);
                } catch (error) {
                    // Already-reported request failures must not replace the View.
                    if (!(error instanceof ReportedError)) throw error;
                } finally {
                    actionInFlight.current = false;
                }
            });
        } catch (error) {
            actionInFlight.current = false;

            if (!(error instanceof ReportedError)) {
                startTransition(async () => {
                    throw error;
                });
            }
        }
    }

    const content = (
        <Text color="inherit">
            {isPending && (
                <span role="status" aria-label="Loading" className="inline-flex align-middle">
                    <Spinner aria-hidden="true" className="motion-reduce:animate-none" />
                </span>
            )}
            {children}
        </Text>
    );

    const interaction = {
        className: cn(
            buttonVariants({ variant: 'link', size: null }),
            'align-baseline whitespace-normal aria-disabled:pointer-events-none aria-disabled:opacity-50'
        ),
        'aria-disabled': blocked || undefined,
        'aria-busy': isPending || undefined,
        onClick: activate,
        onKeyDown: (event: React.KeyboardEvent<HTMLAnchorElement | HTMLButtonElement>) => {
            if (blocked && (event.key === 'Enter' || event.key === ' ')) event.preventDefault();
        }
    };

    return (
        <>
            {to === undefined || blocked ? (
                <button {...interaction} type="button">
                    {content}
                </button>
            ) : (
                <NavigationLink {...interaction} href={to} download={download}>
                    {content}
                </NavigationLink>
            )}
            {attachment.error && (
                <span role="alert">
                    <Text>{attachment.error}</Text>
                </span>
            )}
        </>
    );
}
