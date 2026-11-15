import { it, expect, vi } from 'vitest';
import { ReportedError } from '@/lib/reported';
import { Link } from '@/components/custom/link';
// @vitest-environment happy-dom
import { act, createRef, useState } from 'react';
import userEvent from '@testing-library/user-event';
import { renderStatic, withMounted } from '../../render';
import { FileRequestContext } from '@/components/custom/preview';
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

it('uses the scoped download capability rather than native navigation', async () => {
    const navigate = vi.fn();
    const download = vi.fn(async () => {});

    await withMounted(
        <FileRequestContext value={{ load: vi.fn(), preview: vi.fn(), download }}>
            <LinkNavigationContext value={{ baseUrl: '/solutions/orders', navigate }}>
                <Link href="/invoice.pdf" download="invoice.pdf">
                    Invoice
                </Link>
            </LinkNavigationContext>
        </FileRequestContext>,
        async (output) => {
            const control = output.querySelector('button');

            if (!control) throw new Error('Expected download action');
            expect(control.hasAttribute('download')).toBe(false);
            expect(output.querySelector('a')).toBeNull();
            await act(async () => control.click());
            expect(download).toHaveBeenCalledExactlyOnceWith('/invoice.pdf', 'invoice.pdf');
            expect(navigate).not.toHaveBeenCalled();
        }
    );
});

it.each([false, true])(
    'keeps disabled actions discoverable without keyboard or click actions (file: %s)',
    async (file) => {
        const action = vi.fn();
        const user = userEvent.setup();

        await withMounted(
            file ? (
                <Link href="/invoice.pdf" download="invoice.pdf" disabled onClick={action}>
                    Unavailable
                </Link>
            ) : (
                <Link disabled onClick={action}>
                    Unavailable
                </Link>
            ),
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
    }
);

it('runs keyboard actions without submitting the form and preserves focus while blocking duplicate work', async () => {
    let release = () => {};

    const pending = new Promise<void>((resolve) => {
        release = resolve;
    });

    const action = vi.fn(() => pending);
    const submit = vi.fn((event: React.FormEvent) => event.preventDefault());
    const user = userEvent.setup();

    try {
        await withMounted(
            <form onSubmit={submit}>
                <Link onClick={action}>Save</Link>
            </form>,
            async (output) => {
                const control = output.querySelector('button');

                if (!control) throw new Error('Expected action button');

                await act(async () => user.tab());
                await act(async () => user.keyboard('{Enter}'));
                expect(action).toHaveBeenCalledTimes(1);
                expect(control.getAttribute('aria-busy')).toBe('true');
                expect(document.activeElement).toBe(control);
                await act(async () => user.keyboard('{Enter} '));
                await act(async () => control.click());
                expect(action).toHaveBeenCalledTimes(1);
                expect(submit).not.toHaveBeenCalled();

                await act(async () => {
                    release();
                    await pending;
                });
                expect(control.hasAttribute('aria-busy')).toBe(false);
                expect(document.activeElement).toBe(control);
                await act(async () => user.keyboard(' '));
                expect(action).toHaveBeenCalledTimes(2);
                expect(submit).not.toHaveBeenCalled();
            }
        );
    } finally {
        release();
    }
});

it('blocks disabled navigation and its callback until enabled', async () => {
    const navigate = vi.fn();
    const action = vi.fn();
    const user = userEvent.setup();

    function Navigation() {
        const [disabled, setDisabled] = useState(true);

        return (
            <LinkNavigationContext value={{ baseUrl: '/solutions/orders', navigate }}>
                <Link href="/orders" disabled={disabled} onClick={action}>
                    Orders
                </Link>
                <button onClick={() => setDisabled(false)}>Enable</button>
            </LinkNavigationContext>
        );
    }

    await withMounted(<Navigation />, async (output) => {
        const anchor = output.querySelector('a');

        if (!anchor) throw new Error('Expected navigation link');

        await act(async () => user.tab());
        expect(document.activeElement).toBe(anchor);
        expect(anchor.hasAttribute('href')).toBe(false);
        await act(async () => user.keyboard('{Enter}'));
        await act(async () => anchor.click());
        expect(action).not.toHaveBeenCalled();
        expect(navigate).not.toHaveBeenCalled();
        await act(async () => output.querySelector('button')?.click());
        await act(async () => anchor.click());
        expect(action).toHaveBeenCalledTimes(1);
        expect(navigate).toHaveBeenCalledExactlyOnceWith('/orders');
    });
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
            <FileRequestContext
                value={{
                    load: async () => {
                        throw new Error('Downloads must not load file bytes in the View');
                    },
                    preview: async () => {
                        throw new Error('Downloads must not open a preview');
                    },
                    download
                }}
            >
                <LinkNavigationContext value={{ baseUrl: '/solutions/orders', navigate }}>
                    <Link href="/invoice.pdf" download="invoice.pdf" onClick={action}>
                        Download
                    </Link>
                </LinkNavigationContext>
            </FileRequestContext>,
            async (output) => {
                const anchor = output.querySelector('button');

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
                expect(output.querySelector('button')?.hasAttribute('aria-busy')).toBe(false);
                await act(async () => output.querySelector('button')?.click());
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
                <Link
                    onClick={() => {
                        setMessage('Saving');

                        return pending;
                    }}
                >
                    Save
                </Link>
            </>
        );
    }

    try {
        await withMounted(
            <FileRequestContext
                value={{
                    load: async () => {
                        throw new Error('Attachment links must not load file bytes');
                    },
                    preview: async () => {},
                    download: async () => {}
                }}
            >
                <Action />
            </FileRequestContext>,
            async (output) => {
                await act(async () => output.querySelector('button')?.click());
                expect(output.querySelector('output')?.textContent).toBe('Saving');
                expect(output.querySelector('button')?.getAttribute('aria-busy')).toBe('true');
                await act(async () => {
                    release();
                    await pending;
                });
                expect(output.querySelector('button')?.hasAttribute('aria-busy')).toBe(false);
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
    const preview = vi.fn(async () => {});

    const load = vi.fn(async () => {
        throw new Error('Attachment links must not load file bytes');
    });

    const navigate = vi.fn();

    await withMounted(
        <FileRequestContext value={{ load, preview, download: async () => {} }}>
            <LinkNavigationContext value={{ baseUrl: '/solutions/orders', navigate }}>
                <Link href="/invoice.pdf" preview="Invoice" onClick={(event) => event.preventDefault()}>
                    Preview
                </Link>
            </LinkNavigationContext>
        </FileRequestContext>,
        async (output) => {
            const event = new MouseEvent('click', { bubbles: true, cancelable: true });
            await act(async () => output.querySelector('button')?.dispatchEvent(event));
            expect(event.defaultPrevented).toBe(true);
            expect(preview).not.toHaveBeenCalled();
            expect(load).not.toHaveBeenCalled();
            expect(navigate).not.toHaveBeenCalled();
            expect(output.querySelector('button')?.hasAttribute('aria-busy')).toBe(false);
        }
    );
});

it('opens previews through the scoped capability without a native download', async () => {
    const preview = vi.fn(async () => {});

    const load = vi.fn(async () => {
        throw new Error('Attachment links must not load file bytes');
    });

    const download = vi.fn(async () => {});
    const navigate = vi.fn();

    await withMounted(
        <FileRequestContext value={{ load, preview, download }}>
            <LinkNavigationContext value={{ baseUrl: '/solutions/orders', navigate }}>
                <Link href="/invoice.pdf" preview="Invoice">
                    Preview
                </Link>
            </LinkNavigationContext>
        </FileRequestContext>,
        async (output) => {
            const anchor = output.querySelector('button');

            if (!anchor) throw new Error('Expected attachment link');
            expect(anchor.hasAttribute('download')).toBe(false);
            const event = new MouseEvent('click', { bubbles: true, cancelable: true });
            await act(async () => anchor.dispatchEvent(event));
            expect(event.defaultPrevented).toBe(true);
            expect(preview).toHaveBeenCalledExactlyOnceWith('/invoice.pdf', 'Invoice');
            expect(load).not.toHaveBeenCalled();
            expect(download).not.toHaveBeenCalled();
            expect(navigate).not.toHaveBeenCalled();
        }
    );
});

it('recovers after a scoped preview failure has already been reported', async () => {
    const preview = vi
        .fn<() => Promise<void>>()
        .mockRejectedValueOnce(new ReportedError('Request already reported'))
        .mockResolvedValue(undefined);

    await withMounted(
        <FileRequestContext
            value={{
                load: async () => {
                    throw new Error('Attachment links must not load file bytes');
                },
                preview,
                download: async () => {}
            }}
        >
            <Link href="/invoice.pdf" preview="Invoice">
                Preview
            </Link>
        </FileRequestContext>,
        async (output) => {
            await act(async () => output.querySelector('button')?.click());
            expect(output.textContent).toBe('Preview');
            expect(output.querySelector('button')?.hasAttribute('aria-busy')).toBe(false);
            await act(async () => output.querySelector('button')?.click());
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

    await withMounted(<Link onClick={action}>Retry</Link>, async (output) => {
        await act(async () => output.querySelector('button')?.click());
        expect(output.textContent).toBe('Retry');
        expect(output.querySelector('button')?.hasAttribute('aria-busy')).toBe(false);
        await act(async () => output.querySelector('button')?.click());
        expect(action).toHaveBeenCalledTimes(2);
    });
});

it('reports a missing download capability instead of navigating or claiming success', async () => {
    await withMounted(
        <Link href="/invoice.pdf" download="invoice.pdf">
            Download
        </Link>,
        async (output) => {
            await act(async () => output.querySelector('button')?.click());
            expect(output.querySelector('[role="alert"]')?.textContent).toBe('Downloads require the Solution runtime');
            expect(output.querySelector('button')?.hasAttribute('aria-busy')).toBe(false);
        }
    );
});
