import { cn } from 'cn';
import { ReportedError } from '@/lib/reported';
import { isCanceledRequest } from '@/lib/errors';
import { Spinner } from '@/components/shadcn/spinner';
import { FilePreview } from '@/components/dialogs/file-preview';
import { buttonVariants } from '@/components/longlink/action/button';
import { resolveExternalUrl, resolveScopedNavigationUrl } from '@/lib/url';
import { RequestContext, LinkNavigationContext } from '@/components/custom/contexts';
import { useContext, useRef, useState, useTransition, type ComponentPropsWithRef, type MouseEvent } from 'react';

type ActionLinkProps = Omit<ComponentPropsWithRef<'button'>, 'onClick' | 'type' | 'className'> &
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
    | (Omit<ComponentPropsWithRef<'a'>, 'download' | 'className'> & {
          href: string;
          preview?: never;
          download?: never;
          disabled?: boolean;
      })
    | ActionLinkProps;

/** Preserves native link gestures while routing ordinary internal clicks through the host. */
export function NavigationLink({ href, target, rel, download, onClick, ...props }: ComponentPropsWithRef<'a'>) {
    const navigation = useContext(LinkNavigationContext);
    const internalHref = navigation && href ? resolveScopedNavigationUrl(navigation.baseUrl, href) : '';
    let destination = navigation ? internalHref || undefined : href;

    // Native external navigation accepts only the same HTTP(S) destinations as the host bridge.
    if (navigation && href && !internalHref) destination = resolveExternalUrl(document.baseURI, href);

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

    const { disabled, onClick, ...navigation } = props;

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
                'align-baseline whitespace-normal aria-disabled:pointer-events-none aria-disabled:opacity-50'
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
    children,
    ...props
}: ActionLinkProps) {
    const requests = useContext(RequestContext);
    const [filePreview, setFilePreview] = useState<Blob>();
    const [downloadError, setDownloadError] = useState<string>();
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

        let result: void | Promise<void>;

        try {
            result = onClick?.(event);
        } catch (error) {
            result = Promise.reject(error);
        }

        const canceled = event.defaultPrevented;
        event.preventDefault();

        // A caller can cancel the file operation while retaining its own action.
        startTransition(async () => {
            try {
                await result;

                if (canceled || href === undefined) return;

                if (preview !== undefined) {
                    if (!requests) throw new Error('Previews require the Solution runtime');
                    const body = await requests.request(href, { binary: true });
                    if (!(body instanceof Blob)) throw new Error('File preview unavailable');
                    setFilePreview(body);
                } else if (download !== undefined) {
                    setDownloadError(undefined);

                    try {
                        if (!requests) throw new Error('Downloads require the Solution runtime');
                        const filename = download.replace(/[/\\\p{Cc}]/gu, '_').slice(0, 256) || 'attachment';
                        await requests.download(href, filename);
                    } catch (failure) {
                        if (!(failure instanceof ReportedError)) {
                            setDownloadError(failure instanceof Error ? failure.message : 'Download failed');
                        }
                    }
                }
            } catch (error) {
                if (!(error instanceof ReportedError) && !isCanceledRequest(error)) throw error;
            } finally {
                actionInFlight.current = false;
            }
        });
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
                    'gap-1.5 align-baseline whitespace-normal aria-disabled:pointer-events-none aria-disabled:opacity-50'
                )}
            >
                {isPending && (
                    <span role="status" aria-label="Loading" className="inline-flex align-middle">
                        <Spinner aria-hidden="true" className="motion-reduce:animate-none" />
                    </span>
                )}
                {children}
            </button>
            {downloadError && <span role="alert">{downloadError}</span>}
            {preview !== undefined && filePreview !== undefined && (
                <FilePreview body={filePreview} title={preview} onOpenChange={() => setFilePreview(undefined)} />
            )}
        </>
    );
}
