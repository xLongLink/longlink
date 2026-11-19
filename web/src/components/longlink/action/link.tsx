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
import {
    useContext,
    useRef,
    useState,
    useCallback,
    useTransition,
    type Ref,
    type RefCallback,
    type ContextType,
    type DOMAttributes,
    type MouseEvent,
    type HTMLAttributes,
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
> & { href: string; preview?: never; download?: boolean; disabled?: boolean; isExternalLink?: boolean };

type ButtonLinkProps = LinkElementProps<
    ButtonHTMLAttributes<HTMLButtonElement>,
    AnchorHTMLAttributes<HTMLAnchorElement>
>;

type PreviewProps = ButtonLinkProps & { href: string; preview: string; download?: never; isExternalLink?: never };

type DownloadProps = LinkElementProps<
    HTMLAttributes<HTMLElement> & Pick<AnchorHTMLAttributes<HTMLElement>, 'target' | 'rel'>,
    AnchorHTMLAttributes<HTMLElement> & ButtonHTMLAttributes<HTMLElement>
> & { href: string; download: string; preview?: never; disabled?: boolean; isExternalLink?: boolean };

type CallbackProps = ButtonLinkProps &
    Required<Pick<ButtonLinkProps, 'onClick'>> & {
        href?: never;
        preview?: never;
        download?: never;
        isExternalLink?: never;
    };

type ActionLinkProps = (PreviewProps | DownloadProps | CallbackProps) & { ref?: RefCallback<HTMLElement> };

type LinkProps = (NavigationProps | PreviewProps | DownloadProps | CallbackProps) &
    VariantProps<typeof buttonVariants> & { ref?: Ref<HTMLElement>; fullWidth?: boolean };

/** Renders navigation as an anchor and file or callback actions as link-styled buttons. */
export function Link(props: LinkProps) {
    const requests = useContext(RequestContext);
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

    if (
        link.preview !== undefined ||
        link.href === undefined ||
        (typeof link.download === 'string' && (requests || navigationContext))
    ) {
        return <ActionLink {...link} ref={elementRef} className={className} requests={requests} />;
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
    requests,
    ...props
}: ActionLinkProps & { className: string; requests: ContextType<typeof RequestContext> }) {
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

        let result: unknown;

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
                } else {
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
                style={undefined}
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
