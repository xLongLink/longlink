import { it, expect, vi } from 'vitest';
import { ReportedError } from '@/lib/reported';
import { Link } from '@/components/custom/link';
// @vitest-environment happy-dom
import { act, createRef, useState } from 'react';
import userEvent from '@testing-library/user-event';
import { renderStatic, withMounted } from '../../render';
import { FileRequestContext } from '@/components/custom/preview';
import { AttachmentLink } from '@/components/custom/attachment-link';
import { LinkNavigationContext } from '@/components/custom/contexts';

it('keeps a Solution-relative destination on the rendered link', () => {
    // Act
    const output = renderStatic(<Link href="/orders">Orders</Link>);

    // Assert
    expect(output.querySelector('a')?.getAttribute('href')).toBe('/orders');
    expect(output.querySelector('a')?.textContent).toBe('Orders');
});

it('delegates ordinary solution navigation while preserving canceled, modified and middle clicks', async () => {
    const navigate = vi.fn();
    let cancel = false;

    await withMounted(
        <LinkNavigationContext value={{ baseUrl: '/solutions/orders', navigate }}>
            <Link href="/invoices" onClick={(event) => cancel && event.preventDefault()}>
                Invoices
            </Link>
        </LinkNavigationContext>,
        async (output) => {
            const anchor = output.querySelector('a');

            if (!anchor) throw new Error('Expected navigation link');
            expect(anchor.getAttribute('href')).toBe('/solutions/orders/invoices');

            for (const gesture of [
                { ctrlKey: true },
                { metaKey: true },
                { shiftKey: true },
                { altKey: true },
                { button: 1 }
            ]) {
                const event = new MouseEvent('click', { bubbles: true, cancelable: true, ...gesture });
                await act(async () => anchor.dispatchEvent(event));
                expect(event.defaultPrevented).toBe(false);
            }

            cancel = true;
            await act(async () => anchor.click());
            expect(navigate).not.toHaveBeenCalled();
            cancel = false;
            await act(async () => anchor.click());
            expect(navigate).toHaveBeenCalledExactlyOnceWith('/invoices');
        }
    );
});

it.each(['javascript:alert(1)', 'data:text/html,unsafe', 'https://user:password@example.com/private'])(
    'withholds unsafe destination %s without delegating it to the host',
    async (href) => {
        const navigate = vi.fn();

        await withMounted(
            <LinkNavigationContext value={{ baseUrl: '/solutions/orders', navigate }}>
                <Link href={href}>Unsafe</Link>
            </LinkNavigationContext>,
            async (output) => {
                const anchor = output.querySelector('a');

                if (!anchor) throw new Error('Expected navigation link');
                expect(anchor.hasAttribute('href')).toBe(false);
                const event = new MouseEvent('click', { bubbles: true, cancelable: true });
                await act(async () => anchor.dispatchEvent(event));
                expect(event.defaultPrevented).toBe(true);
                expect(navigate).not.toHaveBeenCalled();
            }
        );
    }
);

it('opens validated external destinations outside the frame without an opener', () => {
    const output = renderStatic(
        <LinkNavigationContext value={{ baseUrl: '/solutions/orders', navigate: vi.fn() }}>
            <Link href="https://example.com/docs">Docs</Link>
        </LinkNavigationContext>
    );

    const anchor = output.querySelector('a');

    expect(anchor?.getAttribute('href')).toBe('https://example.com/docs');
    expect(anchor?.getAttribute('target')).toBe('_blank');
    expect(anchor?.getAttribute('rel')).toBe('noopener noreferrer');
});

it('does not turn a scoped navigation link into an unrestricted native download', async () => {
    const navigate = vi.fn();
    const attributes = { href: '/invoice.pdf', download: 'invoice.pdf' };

    await withMounted(
        <LinkNavigationContext value={{ baseUrl: '/solutions/orders', navigate }}>
            <Link {...attributes}>Invoice</Link>
        </LinkNavigationContext>,
        async (output) => {
            const anchor = output.querySelector('a');

            if (!anchor) throw new Error('Expected navigation link');
            expect(anchor.hasAttribute('download')).toBe(false);
            await act(async () => anchor.click());
            expect(navigate).toHaveBeenCalledExactlyOnceWith('/invoice.pdf');
        }
    );
});

it('keeps disabled attachments discoverable without keyboard or click actions', async () => {
    const action = vi.fn();
    const user = userEvent.setup();

    await withMounted(
        <AttachmentLink href="/invoice.pdf" download="invoice.pdf" disabled onClick={action}>
            Unavailable
        </AttachmentLink>,
        async (output) => {
            const control = output.querySelector<HTMLElement>('a, button');

            if (!control) throw new Error('Expected link control');
            await act(async () => user.tab());
            expect(document.activeElement).toBe(control);
            expect(control.getAttribute('aria-disabled')).toBe('true');
            expect(control.tagName).toBe('BUTTON');
            expect(control.hasAttribute('href')).toBe(false);
            await act(async () => user.keyboard('{Enter} '));
            await act(async () => control.click());
            expect(action).not.toHaveBeenCalled();
        }
    );
});

it('guards repeated downloads until the callback and scoped host download finish, then recovers', async () => {
    let release = () => {};

    const pending = new Promise<void>((resolve) => {
        release = resolve;
    });

    const action = vi.fn(() => pending);
    const download = vi.fn(async () => {});
    const navigate = vi.fn();

    try {
        await withMounted(
            <FileRequestContext value={{ preview: async () => null, download }}>
                <LinkNavigationContext value={{ baseUrl: '/solutions/orders', navigate }}>
                    <AttachmentLink href="/invoice.pdf" download="invoice.pdf" onClick={action}>
                        Download
                    </AttachmentLink>
                </LinkNavigationContext>
            </FileRequestContext>,
            async (output) => {
                const anchor = output.querySelector('a');

                if (!anchor) throw new Error('Expected download link');
                await act(async () => {
                    anchor.click();
                    anchor.click();
                });
                expect(action).toHaveBeenCalledTimes(1);
                expect(download).not.toHaveBeenCalled();
                expect(output.querySelector('button')?.getAttribute('aria-busy')).toBe('true');
                expect(output.querySelector('[role="status"]')?.getAttribute('aria-label')).toBe('Loading');
                await act(async () => {
                    release();
                    await pending;
                });
                expect(download).toHaveBeenCalledExactlyOnceWith('/invoice.pdf', 'invoice.pdf');
                expect(navigate).not.toHaveBeenCalled();
                expect(output.querySelector('a')?.hasAttribute('aria-busy')).toBe(false);
                await act(async () => output.querySelector('a')?.click());
                expect(download).toHaveBeenCalledTimes(2);
            }
        );
    } finally {
        release();
    }
});

it('commits callback state updates before the returned promise settles', async () => {
    let release = () => {};

    const pending = new Promise<void>((resolve) => {
        release = resolve;
    });

    function Action() {
        const [message, setMessage] = useState('Ready');

        return (
            <>
                <output>{message}</output>
                <AttachmentLink
                    href="/invoice.pdf"
                    preview="invoice.pdf"
                    onClick={() => {
                        setMessage('Saving');

                        return pending;
                    }}
                >
                    Save
                </AttachmentLink>
            </>
        );
    }

    try {
        await withMounted(
            <FileRequestContext value={{ preview: async () => null, download: async () => {} }}>
                <Action />
            </FileRequestContext>,
            async (output) => {
                await act(async () => output.querySelector('a')?.click());
                expect(output.querySelector('output')?.textContent).toBe('Saving');
                expect(output.querySelector('button')?.getAttribute('aria-busy')).toBe('true');
                await act(async () => {
                    release();
                    await pending;
                });
                expect(output.querySelector('a')?.hasAttribute('aria-busy')).toBe(false);
            }
        );
    } finally {
        release();
    }
});

it('preserves native anchor props and ref without wrapping caller-owned content', async () => {
    const anchorRef = createRef<HTMLAnchorElement>();
    const navigate = vi.fn();

    await withMounted(
        <LinkNavigationContext value={{ baseUrl: '/solutions/orders', navigate }}>
            <Link
                href="/invoices"
                ref={anchorRef}
                target="_blank"
                rel="nofollow"
                className="custom-link"
                title="Invoices"
            >
                <strong>Invoices</strong>
            </Link>
        </LinkNavigationContext>,
        async (output) => {
            const anchor = output.querySelector('a');

            if (!anchor) throw new Error('Expected navigation link');
            expect(anchorRef.current).toBe(anchor);
            expect(anchor.firstElementChild?.tagName).toBe('STRONG');
            expect(anchor.title).toBe('Invoices');
            expect(anchor.classList.contains('custom-link')).toBe(true);
            expect(anchor.rel).toBe('nofollow noopener noreferrer');
            let preventedByLink = true;

            // Observe the navigation decision, then stop happy-dom from loading another document.
            output.addEventListener(
                'click',
                (event) => {
                    preventedByLink = event.defaultPrevented;
                    event.preventDefault();
                },
                { once: true }
            );
            const event = new MouseEvent('click', { bubbles: true, cancelable: true });
            await act(async () => anchor.dispatchEvent(event));
            expect(preventedByLink).toBe(false);
            expect(navigate).not.toHaveBeenCalled();
        }
    );
});

it('allows canceling an attachment preview without navigating or requesting file bytes', async () => {
    const preview = vi.fn(async () => null);
    const navigate = vi.fn();

    await withMounted(
        <FileRequestContext value={{ preview, download: async () => {} }}>
            <LinkNavigationContext value={{ baseUrl: '/solutions/orders', navigate }}>
                <AttachmentLink href="/invoice.pdf" preview="Invoice" onClick={(event) => event.preventDefault()}>
                    Preview
                </AttachmentLink>
            </LinkNavigationContext>
        </FileRequestContext>,
        async (output) => {
            const event = new MouseEvent('click', { bubbles: true, cancelable: true });
            await act(async () => output.querySelector('a')?.dispatchEvent(event));
            expect(event.defaultPrevented).toBe(true);
            expect(preview).not.toHaveBeenCalled();
            expect(navigate).not.toHaveBeenCalled();
            expect(output.querySelector('a')?.hasAttribute('aria-busy')).toBe(false);
        }
    );
});

it('opens previews through the scoped capability without a native download', async () => {
    const preview = vi.fn(async () => null);
    const navigate = vi.fn();

    await withMounted(
        <FileRequestContext value={{ preview, download: async () => {} }}>
            <LinkNavigationContext value={{ baseUrl: '/solutions/orders', navigate }}>
                <AttachmentLink href="/invoice.pdf" preview="Invoice">
                    Preview
                </AttachmentLink>
            </LinkNavigationContext>
        </FileRequestContext>,
        async (output) => {
            const anchor = output.querySelector('a');

            if (!anchor) throw new Error('Expected attachment link');
            expect(anchor.hasAttribute('download')).toBe(false);
            const event = new MouseEvent('click', { bubbles: true, cancelable: true });
            await act(async () => anchor.dispatchEvent(event));
            expect(event.defaultPrevented).toBe(true);
            expect(preview).toHaveBeenCalledExactlyOnceWith('/invoice.pdf', 'Invoice');
            expect(navigate).not.toHaveBeenCalled();
        }
    );
});

it('recovers after a scoped preview failure has already been reported', async () => {
    const preview = vi
        .fn<() => Promise<null>>()
        .mockRejectedValueOnce(new ReportedError('Request already reported'))
        .mockResolvedValue(null);

    await withMounted(
        <FileRequestContext value={{ preview, download: async () => {} }}>
            <AttachmentLink href="/invoice.pdf" preview="Invoice">
                Preview
            </AttachmentLink>
        </FileRequestContext>,
        async (output) => {
            await act(async () => output.querySelector('a')?.click());
            expect(output.textContent).toBe('Preview');
            expect(output.querySelector('a')?.hasAttribute('aria-busy')).toBe(false);
            await act(async () => output.querySelector('a')?.click());
            expect(preview).toHaveBeenCalledTimes(2);
            expect(output.querySelector('[role="alert"]')).toBeNull();
        }
    );
});

it.each([false, true])('recovers from an already-reported action failure (async: %s)', async (asynchronous) => {
    const failure = new ReportedError('Request already reported');

    const action = vi.fn(() => {
        if (asynchronous) return Promise.reject(failure);
        throw failure;
    });

    await withMounted(
        <AttachmentLink href="/invoice.pdf" download="invoice.pdf" onClick={action}>
            Retry
        </AttachmentLink>,
        async (output) => {
            await act(async () => output.querySelector('a')?.click());
            expect(output.textContent).toBe('Retry');
            expect(output.querySelector('a')?.hasAttribute('aria-busy')).toBe(false);
            await act(async () => output.querySelector('a')?.click());
            expect(action).toHaveBeenCalledTimes(2);
        }
    );
});

it('reports a missing download capability instead of navigating or claiming success', async () => {
    await withMounted(
        <AttachmentLink href="/invoice.pdf" download="invoice.pdf">
            Download
        </AttachmentLink>,
        async (output) => {
            await act(async () => output.querySelector('a')?.click());
            expect(output.querySelector('[role="alert"]')?.textContent).toBe('Downloads require the Solution runtime');
            expect(output.querySelector('a')?.hasAttribute('aria-busy')).toBe(false);
        }
    );
});
