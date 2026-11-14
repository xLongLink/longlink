import { cn } from 'cn';
import { Link } from './link';
import { ReportedError } from '@/lib/reported';
import { isCanceledRequest } from '@/lib/errors';
import { Spinner } from '@/components/shadcn/spinner';
import { FileRequestContext, useDownload } from './preview';
import { buttonVariants } from '@/components/shadcn/button';
import { useContext, useRef, useTransition, type MouseEvent, type ReactNode } from 'react';

type AttachmentLinkProps = {
    href: string;
    disabled?: boolean;
    onClick?: (event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void | Promise<void>;
    children?: ReactNode;
} & ({ preview: string; download?: never } | { download: string; preview?: never });

/** Opens or downloads a file exclusively through the scoped Solution capability. */
export function AttachmentLink({ href, download, preview, disabled = false, onClick, children }: AttachmentLinkProps) {
    const attachment = useDownload();
    const files = useContext(FileRequestContext);
    const actionInFlight = useRef(false);
    const [isPending, startTransition] = useTransition();
    const blocked = disabled || isPending;

    // Prevent duplicate actions before React commits the pending state.
    function activate(event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) {
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

            // A caller can cancel the file operation without allowing native navigation.
            startTransition(async () => {
                try {
                    await result;

                    if (canceled) return;

                    if (preview !== undefined) {
                        if (!files) throw new Error('Previews require the Solution runtime');
                        await files.preview(href, preview);
                    } else {
                        await attachment.download(href, download);
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

    const content = (
        <>
            {isPending && (
                <span role="status" aria-label="Loading" className="inline-flex align-middle">
                    <Spinner aria-hidden="true" className="motion-reduce:animate-none" />
                </span>
            )}
            {children}
        </>
    );

    const interaction = {
        'aria-disabled': blocked || undefined,
        'aria-busy': isPending || undefined,
        'aria-haspopup': preview !== undefined ? ('dialog' as const) : undefined,
        onClick: activate,
        onKeyDown: (event: React.KeyboardEvent<HTMLAnchorElement | HTMLButtonElement>) => {
            if (blocked && (event.key === 'Enter' || event.key === ' ')) event.preventDefault();
        }
    };

    return (
        <>
            {blocked ? (
                <button
                    {...interaction}
                    type="button"
                    className={cn(
                        buttonVariants({ variant: 'link', size: null }),
                        'align-baseline whitespace-normal aria-disabled:pointer-events-none aria-disabled:opacity-50'
                    )}
                >
                    {content}
                </button>
            ) : (
                <Link {...interaction} href={href}>
                    {content}
                </Link>
            )}
            {attachment.error && <span role="alert">{attachment.error}</span>}
        </>
    );
}
