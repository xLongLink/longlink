import { cn } from 'cn';
import { ReportedError } from '@/lib/reported';
import { isCanceledRequest } from '@/lib/errors';
import { resolveNavigationUrl } from '@/lib/url';
import { LinkNavigationContext } from './contexts';
import { Spinner } from '@/components/shadcn/spinner';
import { FileRequestContext, useDownload } from './preview';
import { buttonVariants } from '@/components/shadcn/button';
import { useContext, useRef, useTransition, type ComponentPropsWithRef, type MouseEvent } from 'react';

type ActionLinkProps = Omit<ComponentPropsWithRef<'button'>, 'onClick' | 'type'> &
    (
        | {
              href: string;
              preview: string;
              download?: never;
              onClick?: (event: MouseEvent<HTMLButtonElement>) => void | Promise<void>;
          }
        | {
              href: string;
              download: string;
              preview?: never;
              onClick?: (event: MouseEvent<HTMLButtonElement>) => void | Promise<void>;
          }
        | {
              href?: never;
              preview?: never;
              download?: never;
              onClick: (event: MouseEvent<HTMLButtonElement>) => void | Promise<void>;
          }
    );

type LinkProps =
    | (Omit<ComponentPropsWithRef<'a'>, 'download'> & {
          href: string;
          preview?: never;
          download?: never;
          disabled?: boolean;
      })
    | ActionLinkProps;

/** Preserves native link gestures while routing ordinary internal clicks through the host. */
export function NavigationLink({ href, target, rel, download, onClick, ...props }: ComponentPropsWithRef<'a'>) {
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
            download={navigation ? undefined : download}
            target={navigation && !internalHref ? '_blank' : target}
            rel={
                navigation || target === '_blank'
                    ? [...new Set(`${rel ?? ''} noopener noreferrer`.trim().split(/\s+/))].join(' ')
                    : rel
            }
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

/** Renders navigation as an anchor and file or callback actions as link-styled buttons. */
export function Link(props: LinkProps) {
    if (props.preview !== undefined || props.download !== undefined || props.href === undefined) {
        return <ActionLink {...props} />;
    }

    const { className, disabled, onClick, ...navigation } = props;

    // Disabled navigation remains focusable without exposing an active destination.
    return (
        <NavigationLink
            {...navigation}
            href={disabled ? undefined : navigation.href}
            aria-disabled={disabled || undefined}
            tabIndex={disabled ? 0 : navigation.tabIndex}
            onClick={(event) => {
                if (disabled) {
                    event.preventDefault();
                    event.stopPropagation();

                    return;
                }

                onClick?.(event);
            }}
            className={cn(
                buttonVariants({ variant: 'link', size: null }),
                'align-baseline whitespace-normal aria-disabled:pointer-events-none aria-disabled:opacity-50',
                className
            )}
        />
    );
}

/** Owns async action state without changing the button or its focus during pending work. */
function ActionLink({
    href,
    download,
    preview,
    disabled = false,
    onClick,
    onKeyDown,
    className,
    children,
    ...props
}: ActionLinkProps) {
    const attachment = useDownload();
    const files = useContext(FileRequestContext);
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

        try {
            const result = onClick?.(event);
            const canceled = event.defaultPrevented;
            event.preventDefault();

            // A caller can cancel the file operation while retaining its own action.
            startTransition(async () => {
                try {
                    await result;

                    if (canceled) return;

                    if (href !== undefined) {
                        if (preview !== undefined) {
                            if (!files) throw new Error('Previews require the Solution runtime');
                            await files.preview(href, preview);
                        } else if (download !== undefined) {
                            await attachment.download(href, download);
                        }
                    }
                } catch (error) {
                    if (!(error instanceof ReportedError) && !isCanceledRequest(error)) throw error;
                } finally {
                    actionInFlight.current = false;
                }
            });
        } catch (error) {
            event.preventDefault();
            actionInFlight.current = false;

            if (!(error instanceof ReportedError) && !isCanceledRequest(error)) {
                startTransition(async () => {
                    throw error;
                });
            }
        }
    }

    return (
        <>
            <button
                {...props}
                type="button"
                aria-disabled={blocked || undefined}
                aria-busy={isPending || undefined}
                aria-haspopup={preview !== undefined ? 'dialog' : props['aria-haspopup']}
                onClick={activate}
                onKeyDown={(event) => {
                    if (blocked && (event.key === 'Enter' || event.key === ' ')) {
                        event.preventDefault();

                        return;
                    }

                    onKeyDown?.(event);
                }}
                className={cn(
                    buttonVariants({ variant: 'link', size: null }),
                    'gap-1.5 align-baseline whitespace-normal aria-disabled:pointer-events-none aria-disabled:opacity-50',
                    className
                )}
            >
                {isPending && (
                    <span role="status" aria-label="Loading" className="inline-flex align-middle">
                        <Spinner aria-hidden="true" className="motion-reduce:animate-none" />
                    </span>
                )}
                {children}
            </button>
            {attachment.error && <span role="alert">{attachment.error}</span>}
        </>
    );
}
