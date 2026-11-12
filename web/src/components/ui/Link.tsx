import { useDownload } from './preview';
import { ReportedError } from '@/lib/reported';
import { Text } from '@/components/astryx/Text';
import { resolveNavigationUrl } from '@/lib/url';
import { LinkNavigationContext } from './contexts';
import { Spinner } from '@/components/astryx/Spinner';
import { Link as AstryxLink } from '@/components/astryx/Link';
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
    children,
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

    // Download links use the host capability instead of navigating inside the sandbox.
    return (
        <>
            <AstryxLink
                as={NavigationLink}
                href={to}
                download={download}
                isDisabled={disabled || isPending}
                aria-busy={isPending || undefined}
                onClick={(event) => {
                    // Block same-tick activations before React renders the pending state.
                    if (disabled || actionInFlight.current) {
                        event.preventDefault();
                        event.stopPropagation();

                        return;
                    }

                    // Keep download navigation inside the scoped host capability.
                    if (download !== undefined && to !== undefined) event.preventDefault();

                    if (!onClick && download === undefined) return;
                    actionInFlight.current = true;
                    startTransition(async () => {
                        try {
                            await onClick?.(event);

                            if (download !== undefined && to !== undefined) {
                                await attachment.download(to, download);
                            }
                        } catch (error) {
                            // Avoid replacing the View after a request failure was already reported.
                            if (!(error instanceof ReportedError)) throw error;
                        } finally {
                            actionInFlight.current = false;
                        }
                    });
                }}
            >
                {isPending && <Spinner size="sm" label="Loading" />}
                {children}
            </AstryxLink>
            {attachment.error && <Text role="alert">{attachment.error}</Text>}
        </>
    );
}
