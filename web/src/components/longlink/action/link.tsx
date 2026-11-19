import { cn } from 'cn';
import { ArrowUpRight } from 'lucide-react';
import { ReportedError } from '@/lib/reported';
import { isCanceledRequest } from '@/lib/errors';
import { Spinner } from '@/components/shadcn/spinner';
import type { VariantProps } from 'class-variance-authority';
import { FilePreview } from '@/components/dialogs/file-preview';
import { buttonVariants } from '@/components/longlink/action/button';
import { Link as RouterLink, useInRouterContext } from 'react-router';
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

type LinkProps = (
    | (Omit<ComponentPropsWithRef<'a'>, 'download' | 'className'> & {
          href: string;
          preview?: never;
          download?: string | boolean;
          disabled?: boolean;
          isExternalLink?: boolean;
      })
    | ActionLinkProps
) &
    VariantProps<typeof buttonVariants> & { fullWidth?: boolean; visuallyHidden?: boolean };

/** Renders navigation as an anchor and file or callback actions as link-styled buttons. */
export function Link(props: LinkProps) {
    const requests = useContext(RequestContext);
    const navigationContext = useContext(LinkNavigationContext);
    const router = useInRouterContext();
    const {
        variant = 'link',
        size = variant === 'link' ? null : 'default',
        fullWidth,
        visuallyHidden,
        ...link
    } = props;
    const className = cn(
        buttonVariants({ variant, size }),
        'align-baseline whitespace-normal aria-disabled:pointer-events-none aria-disabled:opacity-50',
        fullWidth && 'w-full',
        visuallyHidden && 'sr-only'
    );

    if (
        link.preview !== undefined ||
        link.href === undefined ||
        (typeof link.download === 'string' && (requests || navigationContext))
    ) {
        return <ActionLink {...(link as ActionLinkProps)} className={className} />;
    }

    const {
        disabled,
        onClick,
        children,
        isExternalLink = false,
        href: suppliedHref,
        target: suppliedTarget,
        rel,
        download,
        ...anchor
    } = link as Extract<LinkProps, { isExternalLink?: boolean }>;
    const href = disabled ? undefined : suppliedHref;
    const target = isExternalLink ? '_blank' : suppliedTarget;
    const external = href !== undefined && /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href.trim());
    const internalHref = navigationContext && href ? resolveScopedNavigationUrl(navigationContext.baseUrl, href) : '';
    let destination = navigationContext ? internalHref || undefined : href;

    if (navigationContext && href && !internalHref) destination = resolveExternalUrl(document.baseURI, href);

    const anchorProps = {
        ...anchor,
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

    return <a {...anchorProps} href={destination} download={navigationContext ? undefined : download} />;
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
    className,
    ...props
}: ActionLinkProps & { className: string }) {
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
                className={cn(className, 'gap-1.5')}
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
